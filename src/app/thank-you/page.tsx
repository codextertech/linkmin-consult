import { ThankYouRedirect } from "./thank-you-redirect";

type ThankYouPageProps = {
  searchParams: Promise<{
    name?: string;
  }>;
};

export default async function ThankYouPage({ searchParams }: ThankYouPageProps) {
  const params = await searchParams;
  const name = params.name?.trim() || "there";

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-white/60 bg-white/90 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-800">
          Linkmi Nigeria
        </p>
        <div className="mt-6 space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Thank you {name}.
          </h1>
          <p className="text-base leading-8 text-slate-700 sm:text-lg">
            Your consultation form has been successfully submitted. A Linkmi
            representative will contact you shortly.
          </p>
          <ThankYouRedirect />
        </div>
      </div>
    </main>
  );
}