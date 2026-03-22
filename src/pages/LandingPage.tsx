import { Link } from 'react-router-dom';
import {
  Sparkles,
  Eye,
  TrendingUp,
  FileText,
  Users,
  MessageSquare,
  Mic,
  FolderKanban,
  BarChart3,
  Building2,
  Briefcase,
  Headphones,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

const features = [
  {
    icon: Eye,
    title: 'Brand Visibility Analysis',
    description:
      "Analyze your firm's public brand score across 9 key metrics against a synthetic peer group.",
  },
  {
    icon: TrendingUp,
    title: 'Market Intelligence',
    description:
      'Track recently closed funds and analyze market appetite with AI-powered insights.',
  },
  {
    icon: FileText,
    title: 'Investment Materials',
    description:
      'Generate professional investment summaries, blind teasers, and due diligence reports.',
  },
  {
    icon: Users,
    title: 'Investor Matching',
    description:
      'Score your investor database against AI-generated ideal investor profiles.',
  },
  {
    icon: MessageSquare,
    title: 'Feedback Analysis',
    description:
      'Analyze investor responses to gauge interest levels and extract actionable insights.',
  },
  {
    icon: Mic,
    title: 'Transcript Analysis',
    description:
      'Get meeting debriefs, performance coaching, and structured data from transcripts.',
  },
  {
    icon: FolderKanban,
    title: 'Strategy Classification',
    description:
      'Standardize fund strategy descriptions with AI-powered categorisation.',
  },
  {
    icon: BarChart3,
    title: 'Fundraising Predictor',
    description:
      'Predict fundraising likelihood based on fund performance metrics.',
  },
] as const;

const personas = [
  {
    icon: Building2,
    title: 'Fund Managers',
    description:
      'Streamline your fundraising process with AI-generated materials and market intelligence.',
  },
  {
    icon: Briefcase,
    title: 'Placement Agents',
    description:
      'Score investors, analyze feedback, and track closed deals — all from one dashboard.',
  },
  {
    icon: Headphones,
    title: 'IR Teams',
    description:
      'Generate compliant outreach emails, meeting debriefs, and performance analytics.',
  },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI Capital
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
            >
              Features
            </a>
            <a
              href="#teams"
              className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
            >
              For Teams
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,rgba(59,130,246,0.06),transparent)]" />
        <div className="mx-auto max-w-4xl px-6 pb-24 pt-28 text-center sm:pt-36">
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            AI-Powered Capital Raising
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-500">
            Accelerate your fundraising workflow with intelligent document analysis, investor
            matching, and market intelligence — all in one platform.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              See Features
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          <p className="mt-12 text-sm text-slate-400">
            Trusted by fund managers and placement agents worldwide
          </p>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="bg-slate-50/60 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to raise capital
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              From document analysis to investor outreach, our AI handles the heavy lifting.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold leading-snug">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Who It's For ─── */}
      <section id="teams" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Built for capital raising professionals
            </h2>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {personas.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-slate-200/80 bg-slate-50 p-8 text-center transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="bg-slate-900 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to accelerate your fundraising?
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Get started in minutes. No credit card required.
          </p>
          <Link
            to="/signup"
            className="mt-10 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-500"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-200/60 bg-slate-50 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-6 text-sm text-slate-400">
          <span className="font-medium text-slate-500">AI Capital Raising Assistant</span>
          <span>Built by Alexander Tilmouth</span>
        </div>
      </footer>
    </div>
  );
}
