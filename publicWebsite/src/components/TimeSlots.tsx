import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimeSlot } from "@/data/mockData";

function getSlotStatus(slot: TimeSlot): "busy" | "available" {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const [startH, startM] = slot.start.split(":").map(Number);
  const [endH, endM] = slot.end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
    return slot.busy ? "busy" : "available";
  }
  if (currentMinutes >= endMinutes) {
    return "available"; // past slot is free
  }
  return slot.busy ? "busy" : "available";
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function TimeSlots({ slots }: { slots: TimeSlot[] }) {
  if (!slots || slots.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" /> Time Slots
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {slots.map((slot, i) => {
            const status = getSlotStatus(slot);
            return (
              <div
                key={i}
                className={`p-2 rounded-lg border text-center text-sm transition-colors ${
                  status === "busy"
                    ? "border-destructive/50 bg-destructive/10"
                    : "border-primary/50 bg-primary/10"
                }`}
              >
                <p className="font-medium">
                  {formatTime(slot.start)} – {formatTime(slot.end)}
                </p>
                <Badge
                  variant={status === "busy" ? "destructive" : "default"}
                  className="mt-1 text-xs"
                >
                  {status === "busy" ? "Busy" : "Available"}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
