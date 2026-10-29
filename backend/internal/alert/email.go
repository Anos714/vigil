package alert

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/vigil-monitor/vigil/backend/internal/store"
)

// Email is a rendered transactional email. To is filled from configuration so
// the notifier can keep recipients out of the incident event itself.
type Email struct {
	To      []string
	Subject string
	Text    string
	HTML    string
}

// Sender delivers one email and returns the provider's message ID when
// available.
type Sender interface {
	Send(context.Context, Email) (string, error)
}

// BrevoSender sends transactional email through Brevo's HTTP API.
type BrevoSender struct {
	apiKey   string
	from     brevoAddress
	replyTo  *brevoAddress
	endpoint string
	client   *http.Client
}

type brevoAddress struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

type brevoRequest struct {
	Sender      brevoAddress   `json:"sender"`
	To          []brevoAddress `json:"to"`
	Subject     string         `json:"subject"`
	HTMLContent string         `json:"htmlContent"`
	TextContent string         `json:"textContent"`
	ReplyTo     *brevoAddress  `json:"replyTo,omitempty"`
	Tags        []string       `json:"tags,omitempty"`
}

type brevoResponse struct {
	MessageID string `json:"messageId"`
}

// NewBrevoSender validates the minimum Brevo configuration and returns a
// sender. The endpoint is configurable so tests and local mocks can use a fake
// HTTP server without changing production code.
func NewBrevoSender(apiKey, fromEmail, fromName, replyTo, endpoint string, client *http.Client) (*BrevoSender, error) {
	apiKey = strings.TrimSpace(apiKey)
	fromEmail = strings.TrimSpace(fromEmail)
	if apiKey == "" {
		return nil, errors.New("BREVO_API_KEY is required when ALERT_EMAIL_ENABLED=true")
	}
	if fromEmail == "" {
		return nil, errors.New("ALERT_FROM_EMAIL is required when ALERT_EMAIL_ENABLED=true")
	}
	if strings.TrimSpace(fromName) == "" {
		fromName = "Vigil"
	}
	if strings.TrimSpace(endpoint) == "" {
		endpoint = "https://api.brevo.com/v3/smtp/email"
	}
	if client == nil {
		client = &http.Client{Timeout: 15 * time.Second}
	}

	sender := &BrevoSender{
		apiKey: apiKey,
		from: brevoAddress{
			Email: fromEmail,
			Name:  strings.TrimSpace(fromName),
		},
		endpoint: endpoint,
		client:   client,
	}
	if replyTo = strings.TrimSpace(replyTo); replyTo != "" {
		sender.replyTo = &brevoAddress{Email: replyTo}
	}
	return sender, nil
}

// Send posts one email to Brevo. Non-2xx responses include a bounded body so
// operators can diagnose provider errors without flooding logs.
func (s *BrevoSender) Send(ctx context.Context, msg Email) (string, error) {
	if len(msg.To) == 0 {
		return "", errors.New("alert email has no recipients")
	}
	if strings.TrimSpace(msg.Subject) == "" {
		return "", errors.New("alert email has no subject")
	}

	to := make([]brevoAddress, 0, len(msg.To))
	for _, address := range msg.To {
		address = strings.TrimSpace(address)
		if address != "" {
			to = append(to, brevoAddress{Email: address})
		}
	}
	if len(to) == 0 {
		return "", errors.New("alert email has no valid recipients")
	}

	payload := brevoRequest{
		Sender:      s.from,
		To:          to,
		Subject:     msg.Subject,
		HTMLContent: msg.HTML,
		TextContent: msg.Text,
		ReplyTo:     s.replyTo,
		Tags:        []string{"vigil", "incident"},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("encode brevo request: %w", err)
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, s.endpoint, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create brevo request: %w", err)
	}
	request.Header.Set("api-key", s.apiKey)
	request.Header.Set("accept", "application/json")
	request.Header.Set("content-type", "application/json")

	response, err := s.client.Do(request)
	if err != nil {
		return "", fmt.Errorf("send brevo request: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		detail, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return "", fmt.Errorf("brevo returned %s: %s", response.Status, strings.TrimSpace(string(detail)))
	}

	var result brevoResponse
	if err := json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&result); err != nil && !errors.Is(err, io.EOF) {
		return "", fmt.Errorf("decode brevo response: %w", err)
	}
	return result.MessageID, nil
}

// BuildEmail renders the incident opened/resolved message. All incident values
// are escaped before entering the HTML body.
func BuildEmail(event store.IncidentEvent, appURL string) Email {
	appURL = strings.TrimRight(strings.TrimSpace(appURL), "/")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}

	label := "Incident opened"
	statusLabel := "Status"
	if event.Event == "resolved" {
		label = "Incident resolved"
		statusLabel = "Last failure status"
	}
	subject := fmt.Sprintf("[Vigil] %s: %s", label, event.MonitorName)
	status := "no HTTP response"
	if event.StatusCode > 0 {
		status = strconv.Itoa(event.StatusCode)
	}
	occurred := event.OccurredAt.UTC().Format(time.RFC3339)
	resolved := ""
	if event.ResolvedAt != nil {
		resolved = event.ResolvedAt.UTC().Format(time.RFC3339)
	}
	link := appURL + "/dashboard/monitors/" + url.PathEscape(event.MonitorID)
	resolvedRow := ""
	if resolved != "" {
		resolvedRow = fmt.Sprintf(`<tr><td style="padding:8px 0;color:#7a7468;">Resolved</td><td style="padding:8px 0;text-align:right;">%s</td></tr>`, html.EscapeString(resolved))
	}

	lines := []string{
		"Vigil " + strings.ToLower(label),
		"",
		"Monitor:  " + event.MonitorName,
		"Incident: " + event.IncidentID,
		"Severity: " + event.Severity,
		"Status:   " + status,
		"Cause:    " + event.Cause,
		"Started:  " + event.StartedAt.UTC().Format(time.RFC3339),
		"Event:    " + occurred,
	}
	if resolved != "" {
		lines = append(lines, "Resolved: "+resolved)
	}
	lines = append(lines,
		"",
		"Open the monitor: "+link,
		"",
		"This message was sent by Vigil because email alerting is enabled.",
	)
	text := strings.Join(lines, "\n")

	htmlBody := fmt.Sprintf(`<!doctype html>
<html>
<body style="margin:0;background:#f5f3ee;color:#1d1d1b;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;">
  <div style="max-width:560px;margin:32px auto;padding:28px;background:#ffffff;border:1px solid #ddd8cc;border-radius:16px;">
    <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#7a7468;">Vigil alert</div>
    <h1 style="margin:12px 0 6px;font-size:24px;line-height:1.25;">%s</h1>
    <p style="margin:0 0 20px;color:#6d675c;">%s</p>
    <table style="width:100%%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#7a7468;">Severity</td><td style="padding:8px 0;text-align:right;font-weight:600;">%s</td></tr>
      <tr><td style="padding:8px 0;color:#7a7468;">%s</td><td style="padding:8px 0;text-align:right;">%s</td></tr>
      <tr><td style="padding:8px 0;color:#7a7468;">Started</td><td style="padding:8px 0;text-align:right;">%s</td></tr>
      <tr><td style="padding:8px 0;color:#7a7468;">Incident</td><td style="padding:8px 0;text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;">%s</td></tr>
      %s
    </table>
    <div style="margin:18px 0;padding:14px;background:#faf8f3;border:1px solid #ece7dc;border-radius:10px;font-size:13px;line-height:1.5;">
      <strong style="display:block;margin-bottom:4px;">Cause</strong>%s
    </div>
    <a href="%s" style="display:inline-block;margin-top:8px;padding:10px 14px;background:#1d1d1b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;">Open monitor</a>
    <p style="margin:22px 0 0;color:#8a8478;font-size:11px;line-height:1.5;">Sent by Vigil because email alerting is enabled.</p>
  </div>
</body>
</html>`,
		html.EscapeString(label),
		html.EscapeString(event.MonitorName),
		html.EscapeString(event.Severity),
		html.EscapeString(statusLabel),
		html.EscapeString(status),
		html.EscapeString(event.StartedAt.UTC().Format(time.RFC3339)),
		html.EscapeString(event.IncidentID),
		resolvedRow,
		html.EscapeString(event.Cause),
		html.EscapeString(link),
	)

	return Email{
		Subject: subject,
		Text:    text,
		HTML:    htmlBody,
	}
}
