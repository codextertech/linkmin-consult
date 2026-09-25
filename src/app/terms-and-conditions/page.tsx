export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-white/60 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8 lg:p-10">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-800">
            Linkmi Nigeria
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Terms and Conditions
          </h1>
          <p className="text-sm leading-7 text-slate-600 sm:text-base">
            These terms explain how information submitted through the consultation form
            will be reviewed, stored, and used as part of your request for medical support.
          </p>
        </div>

        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-700 sm:text-base">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-950">Information Accuracy</h2>
            <p>
              You agree to provide complete and accurate information. Inaccurate or
              incomplete submissions may affect assessment timelines or the quality of
              support available to you.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-950">Confidentiality</h2>
            <p>
              Linkmi Nigeria will handle your personal and medical information as
              confidential records and restrict access to authorized personnel involved
              in the consultation process.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-950">Medical Documents</h2>
            <p>
              By uploading reports or prescriptions, you confirm that the documents are
              yours or that you have permission to share them for the purpose of this consultation.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-950">Consultation Review</h2>
            <p>
              Submission of this form does not guarantee immediate treatment or an instant
              response. Each request will be reviewed and followed up through the contact
              details you provide.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}