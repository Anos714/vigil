package alert

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/vigil-monitor/vigil/backend/internal/store"
)

func TestBrevoSenderSendsTransactionalEmail(t *testing.T) {
	var gotMethod, gotAPIKey, gotContentType string
	var gotBody brevoRequest

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMethod = r.Method
		gotAPIKey = r.Header.Get("api-key")
		gotContentType = r.Header.Get("content-type")
		if err := json.NewDecoder(r.Body).Decode(&gotBody); err != nil {
			t.Errorf("decode request: %v", err)
		}
		w.Header().Set("content-type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = io.WriteString(w, `{"messageId":"msg_test_123"}`)
	}))
	defer server.Close()

	sender, err := NewBrevoSender(
		"brevo-key",
		"alerts@example.com",
		"Vigil",
		"reply@example.com",
		server.URL,
		server.Client(),
	)
	if err != nil {
		t.Fatalf("new sender: %v", err)
	}

	messageID, err := sender.Send(context.Background(), Email{
		To:      []string{"ops@example.com"},
		Subject: "Vigil alert",
		Text:    "plain text",
		HTML:    "<b>html</b>",
	})
	if err != nil {
		t.Fatalf("send: %v", err)
	}
	if messageID != "msg_test_123" {
		t.Fatalf("message id = %q", messageID)
	}
	if gotMethod != http.MethodPost {
		t.Fatalf("method = %q", gotMethod)
	}
	if gotAPIKey != "brevo-key" {
		t.Fatalf("api-key = %q", gotAPIKey)
	}
	if !strings.Contains(gotContentType, "application/json") {
		t.Fatalf("content-type = %q", gotContentType)
	}
	if gotBody.Sender.Email != "alerts@example.com" || gotBody.Sender.Name != "Vigil" {
		t.Fatalf("sender = %#v", gotBody.Sender)
	}
	if len(gotBody.To) != 1 || gotBody.To[0].Email != "ops@example.com" {
		t.Fatalf("to = %#v", gotBody.To)
	}
	if gotBody.Subject != "Vigil alert" || gotBody.TextContent != "plain text" || gotBody.HTMLContent != "<b>html</b>" {
		t.Fatalf("body = %#v", gotBody)
	}
	if gotBody.ReplyTo == nil || gotBody.ReplyTo.Email != "reply@example.com" {
		t.Fatalf("replyTo = %#v", gotBody.ReplyTo)
	}
}

func TestBrevoSenderReturnsProviderError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = io.WriteString(w, `{"message":"invalid sender"}`)
	}))
	defer server.Close()

	sender, err := NewBrevoSender("key", "alerts@example.com", "Vigil", "", server.URL, server.Client())
	if err != nil {
		t.Fatalf("new sender: %v", err)
	}

	_, err = sender.Send(context.Background(), Email{
		To:      []string{"ops@example.com"},
		Subject: "Vigil alert",
		Text:    "plain text",
		HTML:    "<b>html</b>",
	})
	if err == nil {
		t.Fatal("expected provider error")
	}
	if !strings.Contains(err.Error(), "400") || !strings.Contains(err.Error(), "invalid sender") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestBrevoSenderRequiresConfiguration(t *testing.T) {
	if _, err := NewBrevoSender("", "alerts@example.com", "Vigil", "", "", nil); err == nil {
		t.Fatal("expected missing API key error")
	}
	if _, err := NewBrevoSender("key", "", "Vigil", "", "", nil); err == nil {
		t.Fatal("expected missing sender error")
	}
}

func TestBuildEmailEscapesIncidentValues(t *testing.T) {
	started := time.Date(2026, 10, 29, 10, 0, 0, 0, time.UTC)
	event := store.IncidentEvent{
		IncidentID:  "inc_test",
		MonitorID:   "mon_test",
		MonitorName: "<Search & API>",
		Event:       "opened",
		Severity:    "critical",
		StatusCode:  503,
		Cause:       "connection <refused>",
		StartedAt:   started,
		OccurredAt:  started.Add(time.Minute),
	}

	email := BuildEmail(event, "http://localhost:3000/")
	if !strings.Contains(email.Subject, "Incident opened") || !strings.Contains(email.Subject, "<Search & API>") {
		t.Fatalf("subject = %q", email.Subject)
	}
	if !strings.Contains(email.Text, "connection <refused>") {
		t.Fatalf("text = %q", email.Text)
	}
	if !strings.Contains(email.HTML, "&lt;Search &amp; API&gt;") {
		t.Fatalf("html did not escape monitor name: %s", email.HTML)
	}
	if !strings.Contains(email.HTML, "connection &lt;refused&gt;") {
		t.Fatalf("html did not escape cause: %s", email.HTML)
	}
	if !strings.Contains(email.HTML, "http://localhost:3000/dashboard/monitors/mon_test") {
		t.Fatalf("html missing monitor link: %s", email.HTML)
	}

	resolved := event
	resolved.Event = "resolved"
	resolved.ResolvedAt = &started
	resolvedEmail := BuildEmail(resolved, "")
	if !strings.Contains(resolvedEmail.Subject, "Incident resolved") {
		t.Fatalf("resolved subject = %q", resolvedEmail.Subject)
	}
	if !strings.Contains(resolvedEmail.Text, "Resolved: 2026-10-29T10:00:00Z") {
		t.Fatalf("resolved text = %q", resolvedEmail.Text)
	}
}
