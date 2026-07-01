"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge, StatusDot } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollText, Play, Pause, Trash2 } from "lucide-react";

interface LogEntry {
  raw: string;
  time: string;
  level?: string;
}

function parseLogLine(data: string): LogEntry {
  try {
    const obj = JSON.parse(data);
    return {
      raw: JSON.stringify(obj),
      time: obj.time ?? new Date().toISOString(),
      level: obj.level ?? obj.deploymentid ? "info" : undefined,
    };
  } catch {
    return { raw: data, time: new Date().toISOString() };
  }
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [streaming, setStreaming] = useState(true);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!streaming) {
      eventSourceRef.current?.close();
      setConnected(false);
      return;
    }

    const es = new EventSource("/api/admin/logs");
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (event) => {
      setLogs((prev) => [...prev.slice(-499), parseLogLine(event.data)]);
    };

    return () => {
      es.close();
    };
  }, [streaming]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [logs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot status={connected ? "good" : "neutral"} pulse={connected} />
          <span className="text-sm text-text-secondary">{connected ? "Streaming live" : "Disconnected"}</span>
          <Badge status="neutral">{logs.length} lines buffered</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setStreaming((s) => !s)}>
            {streaming ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {streaming ? "Pause" : "Resume"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setLogs([])}>
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      </div>

      <Card className="h-[calc(100vh-220px)] flex flex-col overflow-hidden">
        {logs.length === 0 ? (
          <EmptyState icon={ScrollText} title="No log activity yet" description="Server log events will stream here in real time as they occur." />
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="text-text-secondary whitespace-pre-wrap break-all leading-relaxed">
                <span className="text-text-muted">{new Date(log.time).toLocaleTimeString()}</span> {log.raw}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
