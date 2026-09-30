import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, MapPin, Phone, User } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { techKeys } from "@/components/technician/tech-ui";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { advanceJob, listMyJobs } from "@/lib/fixright.functions";
import { formatSlot } from "@/lib/format";
import type { TechJob } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/technician/jobs")({
  head: () => ({
    meta: [
      { title: "My jobs — FixRight technician" },
      { name: "description", content: "Your upcoming, active and completed FixRight jobs." },
    ],
  }),
  component: TechnicianJobs,
});

const LABEL: Record<string, string> = {
  awaiting_payment: "Awaiting customer payment",
  scheduled: "Confirmed",
  confirmed: "Confirmed",
  on_the_way: "On the way",
  arrived: "Arrived",
  in_progress: "In progress",
  completed: "Completed",
  no_show: "No show",
};
const NEXT_ACTION: Record<string, string> = {
  confirmed: "I'm on the way",
  scheduled: "I'm on the way",
  on_the_way: "I've arrived",
  arrived: "Start repair",
  in_progress: "Mark completed",
};
const ACTIVE = ["on_the_way", "arrived", "in_progress"];

function JobCard({ job }: { job: TechJob }) {
  const qc = useQueryClient();
  const advance = useServerFn(advanceJob);
  const m = useMutation({
    mutationFn: () => advance({ data: { appointmentId: job.id } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: techKeys.jobs }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't update this job."),
  });
  const action = NEXT_ACTION[job.status];
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{job.service_name} repair</h3>
        <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
          {LABEL[job.status] ?? job.status}
        </span>
      </div>
      <div className="mt-3 grid gap-1.5 text-sm">
        <p className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{job.customer_name ?? "Customer"}</p>
        {job.customer_phone ? (
          <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><a className="text-primary hover:underline" href={`tel:${job.customer_phone}`}>{job.customer_phone}</a></p>
        ) : null}
        <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" />{formatSlot(job.date, job.start_time, job.end_time)}</p>
        <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{job.address}, {job.area_name}</p>
      </div>
      {job.problem_description ? <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">“{job.problem_description}”</p> : null}
      {action ? (
        <Button className="mt-4" disabled={m.isPending} onClick={() => m.mutate()}>{action}</Button>
      ) : null}
    </div>
  );
}

function List({ jobs, empty }: { jobs: TechJob[]; empty: string }) {
  if (!jobs.length) return <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">{empty}</div>;
  return <div className="grid gap-4">{jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>;
}

function TechnicianJobs() {
  const fetchJobs = useServerFn(listMyJobs);
  const { data = [], isLoading } = useQuery({ queryKey: techKeys.jobs, queryFn: () => fetchJobs(), refetchInterval: 30_000 });
  const upcoming = data.filter((j) => ["awaiting_payment", "scheduled", "confirmed"].includes(j.status));
  const active = data.filter((j) => ACTIVE.includes(j.status));
  const completed = data.filter((j) => j.status === "completed").reverse();

  return (
    <>
      <PageHeader title="My Jobs" description="Update the status as you go: on the way, arrived, in progress, completed." />
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-lg border border-border bg-muted" />
      ) : (
        <Tabs defaultValue={active.length ? "active" : "upcoming"}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-5"><List jobs={upcoming} empty="No upcoming jobs." /></TabsContent>
          <TabsContent value="active" className="mt-5"><List jobs={active} empty="No active jobs. Start an upcoming job when you head out." /></TabsContent>
          <TabsContent value="completed" className="mt-5"><List jobs={completed} empty="No completed jobs yet." /></TabsContent>
        </Tabs>
      )}
    </>
  );
}
