import JobPostForm from "@/components/jobs/JobPostForm";

export const metadata = { title: "Post a Job — KhoshGolpo" };

export default function PostJobPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <JobPostForm />
    </div>
  );
}
