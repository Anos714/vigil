package probe

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"net/http/httptrace"
	"sync"
	"time"
)

// Target is the subset of a monitor needed to execute one HTTP probe.
type Target struct {
	URL            string
	Method         string
	ExpectedStatus int
	TimeoutSeconds int
}

// Result is the measured outcome of one HTTP probe.
type Result struct {
	CheckedAt  time.Time
	StatusCode int
	LatencyMS  int
	DNSMS      int
	TCPMS      int
	TLSMS      int
	TTFBMS     int
	Success    bool
	Error      string
}

// Prober executes HTTP checks. It is safe to reuse one Prober across workers.
type Prober struct {
	client    *http.Client
	userAgent string
}

// New creates a prober with a bounded redirect policy.
func New(userAgent string) *Prober {
	return &Prober{
		userAgent: userAgent,
		client: &http.Client{
			CheckRedirect: func(_ *http.Request, via []*http.Request) error {
				if len(via) >= 5 {
					return http.ErrUseLastResponse
				}
				return nil
			},
		},
	}
}

// Probe performs one HTTP request and measures DNS, TCP, TLS, TTFB, and total
// latency. A status-code mismatch is a failed check but still records the code.
func (p *Prober) Probe(ctx context.Context, target Target) Result {
	startedAt := time.Now().UTC()
	result := Result{CheckedAt: startedAt}

	timeoutSeconds := target.TimeoutSeconds
	if timeoutSeconds <= 0 {
		timeoutSeconds = 10
	}
	probeCtx, cancel := context.WithTimeout(ctx, time.Duration(timeoutSeconds)*time.Second)
	defer cancel()

	method := target.Method
	if method == "" {
		method = http.MethodGet
	}

	request, err := http.NewRequestWithContext(probeCtx, method, target.URL, nil)
	if err != nil {
		result.LatencyMS = elapsedMS(startedAt)
		result.Error = err.Error()
		return result
	}
	if p.userAgent != "" {
		request.Header.Set("User-Agent", p.userAgent)
	}

	var mu sync.Mutex
	var dnsStart, dnsDone time.Time
	var connectStart, connectDone time.Time
	var tlsStart, tlsDone time.Time
	var wroteRequest, firstByte time.Time

	trace := &httptrace.ClientTrace{
		DNSStart: func(httptrace.DNSStartInfo) {
			mu.Lock()
			dnsStart = time.Now()
			mu.Unlock()
		},
		DNSDone: func(httptrace.DNSDoneInfo) {
			mu.Lock()
			dnsDone = time.Now()
			mu.Unlock()
		},
		ConnectStart: func(_, _ string) {
			mu.Lock()
			connectStart = time.Now()
			mu.Unlock()
		},
		ConnectDone: func(_, _ string, _ error) {
			mu.Lock()
			connectDone = time.Now()
			mu.Unlock()
		},
		TLSHandshakeStart: func() {
			mu.Lock()
			tlsStart = time.Now()
			mu.Unlock()
		},
		TLSHandshakeDone: func(_ tls.ConnectionState, _ error) {
			mu.Lock()
			tlsDone = time.Now()
			mu.Unlock()
		},
		WroteRequest: func(httptrace.WroteRequestInfo) {
			mu.Lock()
			wroteRequest = time.Now()
			mu.Unlock()
		},
		GotFirstResponseByte: func() {
			mu.Lock()
			firstByte = time.Now()
			mu.Unlock()
		},
	}

	request = request.WithContext(httptrace.WithClientTrace(probeCtx, trace))
	response, err := p.client.Do(request)
	if err != nil {
		result.LatencyMS = elapsedMS(startedAt)
		result.Error = err.Error()
		return result
	}
	defer response.Body.Close()

	if response.Body != nil {
		_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 1<<20))
	}

	mu.Lock()
	dnsStartValue, dnsDoneValue := dnsStart, dnsDone
	connectStartValue, connectDoneValue := connectStart, connectDone
	tlsStartValue, tlsDoneValue := tlsStart, tlsDone
	wroteRequestValue, firstByteValue := wroteRequest, firstByte
	mu.Unlock()

	result.LatencyMS = elapsedMS(startedAt)
	result.StatusCode = response.StatusCode
	result.DNSMS = durationMS(dnsStartValue, dnsDoneValue)
	result.TCPMS = durationMS(connectStartValue, connectDoneValue)
	result.TLSMS = durationMS(tlsStartValue, tlsDoneValue)
	result.TTFBMS = durationMS(wroteRequestValue, firstByteValue)
	result.Success = response.StatusCode == target.ExpectedStatus
	if !result.Success {
		result.Error = fmt.Sprintf("unexpected status %d (want %d)", response.StatusCode, target.ExpectedStatus)
	}

	return result
}

func elapsedMS(start time.Time) int {
	return durationToMS(time.Since(start))
}

func durationMS(start, end time.Time) int {
	if start.IsZero() || end.IsZero() || end.Before(start) {
		return 0
	}
	return durationToMS(end.Sub(start))
}

func durationToMS(duration time.Duration) int {
	if duration <= 0 {
		return 0
	}
	return int((duration + time.Millisecond - 1) / time.Millisecond)
}
