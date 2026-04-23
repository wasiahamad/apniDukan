import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Star } from "lucide-react";

import { platformFeedbackAdminApi, type AdminPlatformFeedbackRow } from "@/lib/api/platformFeedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 20;

const roleLabel = (role: AdminPlatformFeedbackRow["userRole"]) => {
  if (role === "business_owner") return "Dukandar";
  return "Customer";
};

const clip = (value: string, max = 140) => {
  const v = String(value || "").trim();
  if (v.length <= max) return v;
  return `${v.slice(0, max)}…`;
};

export default function PlatformFeedback() {
  const [page, setPage] = useState(1);

  const feedbackQuery = useQuery({
    queryKey: ["admin", "platform-feedback", page],
    queryFn: async () => {
      const res = await platformFeedbackAdminApi.list({ page, limit: PAGE_SIZE });
      if (!res.success || !res.data) throw new Error(res.message || "Failed to load platform feedback");
      return res.data;
    },
  });

  const rows = feedbackQuery.data?.feedback || [];
  const pagination = feedbackQuery.data?.pagination;

  const renderStars = (rating: number) => {
    const safe = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
    return (
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 text-secondary" />
        <span className="text-sm font-medium">{safe}/5</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Feedback</h1>
          <p className="text-sm text-muted-foreground">
            Total: {pagination?.total ?? 0}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> Ratings & Feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Rated By</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbackQuery.isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-72" /></TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No feedback yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
                    const u = r.user;
                    const created = r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN") : "-";
                    const businessName = r.business?.name || (r.userRole === "business_owner" ? "-" : "—");

                    return (
                      <TableRow key={r._id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{created}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{u?.name || "-"}</div>
                            <Badge variant={r.userRole === "business_owner" ? "default" : "secondary"}>
                              {roleLabel(r.userRole)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div>{u?.email || "-"}</div>
                            <div className="text-muted-foreground">{u?.phone || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="space-y-1">
                            <div>{businessName}</div>
                            {r.business?.slug ? (
                              <div className="text-xs text-muted-foreground font-mono">{r.business.slug}</div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{renderStars(r.rating)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.feedback ? clip(r.feedback) : "-"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {feedbackQuery.isError ? (
            <p className="text-sm text-destructive">{(feedbackQuery.error as Error)?.message || "Failed to load feedback"}</p>
          ) : null}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {pagination?.page ?? page} of {pagination?.pages ?? 1}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={(pagination?.page ?? page) <= 1 || feedbackQuery.isFetching}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={pagination ? (pagination.page >= pagination.pages) : feedbackQuery.isFetching}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
