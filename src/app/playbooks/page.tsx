"use client";

import { useState } from "react";
import {
  BookOpen,
  Brain,
  Users,
  Pen,
  ChevronRight,
  Lightbulb,
  Target,
  MessageCircle,
  Layers,
} from "lucide-react";

interface Playbook {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  content: React.ReactNode;
}

const PLAYBOOKS: Playbook[] = [
  {
    id: "strategic-analysis",
    title: "Strategic Content Analysis",
    description: "Analyze content through three strategic lenses",
    icon: Brain,
    color: "purple",
    content: <StrategicAnalysisPlaybook />,
  },
  {
    id: "content-principles",
    title: "Content Principles",
    description: "Core principles for effective content",
    icon: Lightbulb,
    color: "amber",
    content: <ContentPrinciplesPlaybook />,
  },
];

export default function PlaybooksPage() {
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);

  if (selectedPlaybook) {
    return (
      <div className="min-h-screen bg-slate-950">
        {/* Header */}
        <div className="border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <button
              onClick={() => setSelectedPlaybook(null)}
              className="text-sm text-slate-400 hover:text-white mb-2 flex items-center gap-1"
            >
              ← Back to Playbooks
            </button>
            <h1 className="text-xl font-semibold text-white">
              {selectedPlaybook.title}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {selectedPlaybook.description}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          {selectedPlaybook.content}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Playbooks</h1>
        <p className="text-slate-500 mt-1">
          Strategic frameworks and principles for content creation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLAYBOOKS.map((playbook) => {
          const Icon = playbook.icon;
          return (
            <button
              key={playbook.id}
              onClick={() => setSelectedPlaybook(playbook)}
              className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-left hover:border-slate-700 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    playbook.color === "purple"
                      ? "bg-purple-500/20"
                      : playbook.color === "amber"
                      ? "bg-amber-500/20"
                      : "bg-slate-800"
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 ${
                      playbook.color === "purple"
                        ? "text-purple-400"
                        : playbook.color === "amber"
                        ? "text-amber-400"
                        : "text-slate-400"
                    }`}
                  />
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-1">
                {playbook.title}
              </h2>
              <p className="text-sm text-slate-500">{playbook.description}</p>
            </button>
          );
        })}

        {/* Add New Playbook Card */}
        <div className="p-6 border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-500 hover:border-slate-700 transition-colors cursor-pointer">
          <span className="text-sm">+ Add Playbook</span>
        </div>
      </div>
    </div>
  );
}

// Strategic Analysis Playbook Content
function StrategicAnalysisPlaybook() {
  return (
    <div className="prose prose-invert prose-slate max-w-none">
      <p className="text-lg text-slate-300 mb-8">
        Analyze any piece of content through THREE strategic lenses. Focus on WHY choices were made, not WHAT is shown.
      </p>

      {/* Lens 1 */}
      <div className="mb-10 p-6 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-white m-0">Lens 1: Information Theory</h2>
        </div>
        <p className="text-slate-400 mb-4">How does information flow between channels?</p>

        <div className="space-y-3">
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <span className="text-blue-400 font-medium">SIGNAL:</span>
            <span className="text-slate-300 ml-2">What is the ONE core idea being communicated?</span>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <span className="text-blue-400 font-medium">CHANNELS:</span>
            <span className="text-slate-300 ml-2">Audio, visual, text, motion - which are used?</span>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <span className="text-blue-400 font-medium">MODE:</span>
            <ul className="text-slate-400 mt-2 ml-4 space-y-1">
              <li><span className="text-slate-300">Redundant</span> = visual repeats audio (reinforcement)</li>
              <li><span className="text-slate-300">Complementary</span> = visual adds info not in audio (expansion)</li>
              <li><span className="text-slate-300">Primary</span> = one channel carries meaning, other supports</li>
            </ul>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <span className="text-blue-400 font-medium">CHANNEL SWITCHING:</span>
            <span className="text-slate-300 ml-2">When and why do they switch?</span>
            <ul className="text-slate-400 mt-2 ml-4 space-y-1">
              <li>"Audio overloaded → switch to visual"</li>
              <li>"Abstract concept → needs visualization"</li>
              <li>"Emotional moment → strip to talking head"</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <span className="text-blue-400 font-medium">Key Question:</span>
          <span className="text-slate-300 ml-2">"What can't be said in words that the visual shows?"</span>
        </div>
      </div>

      {/* Lens 2 */}
      <div className="mb-10 p-6 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-rose-400" />
          </div>
          <h2 className="text-xl font-semibold text-white m-0">Lens 2: Human Nature</h2>
        </div>
        <p className="text-slate-400 mb-4">What psychological mechanisms are being engaged?</p>

        <div className="space-y-3">
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <span className="text-rose-400 font-medium">PRIMARY DESIRE:</span>
            <span className="text-slate-300 ml-2">What want is being activated?</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {["Status", "Belonging", "Security", "Mastery", "Autonomy", "Novelty"].map((d) => (
                <span key={d} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">{d}</span>
              ))}
            </div>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <span className="text-rose-400 font-medium">PRIMARY FEAR:</span>
            <span className="text-slate-300 ml-2">What fear is being activated?</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {["Missing out", "Falling behind", "Looking foolish", "Being judged", "Losing control"].map((f) => (
                <span key={f} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">{f}</span>
              ))}
            </div>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <span className="text-rose-400 font-medium">IDENTITY PLAY:</span>
            <ul className="text-slate-400 mt-2 ml-4 space-y-1">
              <li>"You're the type of person who..."</li>
              <li>"People like you..."</li>
              <li>"If you're serious about..."</li>
            </ul>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <span className="text-rose-400 font-medium">EMOTIONAL ARC:</span>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className="px-2 py-1 bg-slate-700 rounded text-slate-300">Curiosity</span>
              <span className="text-slate-600">→</span>
              <span className="px-2 py-1 bg-slate-700 rounded text-slate-300">Understanding</span>
              <span className="text-slate-600">→</span>
              <span className="px-2 py-1 bg-slate-700 rounded text-slate-300">Desire</span>
              <span className="text-slate-600">→</span>
              <span className="px-2 py-1 bg-slate-700 rounded text-slate-300">Urgency</span>
              <span className="text-slate-600">→</span>
              <span className="px-2 py-1 bg-slate-700 rounded text-slate-300">Action</span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
          <span className="text-rose-400 font-medium">Key Question:</span>
          <span className="text-slate-300 ml-2">"What does the viewer FEEL at each moment, and why?"</span>
        </div>
      </div>

      {/* Lens 3 */}
      <div className="mb-10 p-6 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Pen className="w-5 h-5 text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-white m-0">Lens 3: Literary Devices</h2>
        </div>
        <p className="text-slate-400 mb-4">What storytelling techniques are employed?</p>

        <div className="space-y-3">
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <span className="text-amber-400 font-medium">NARRATIVE STRUCTURE:</span>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              {[
                "Problem → Solution",
                "Before → After",
                "Question → Answer",
                "Journey → Transformation",
                "Setup → Conflict → Resolution"
              ].map((s) => (
                <span key={s} className="px-2 py-1 bg-slate-700 rounded text-slate-300">{s}</span>
              ))}
            </div>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg">
            <span className="text-amber-400 font-medium">DEVICES:</span>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <div><span className="text-slate-300">Metaphor</span> <span className="text-slate-500">- Abstract made concrete</span></div>
              <div><span className="text-slate-300">Contrast</span> <span className="text-slate-500">- Before/after, us/them</span></div>
              <div><span className="text-slate-300">Rule of Three</span> <span className="text-slate-500">- Lists, examples</span></div>
              <div><span className="text-slate-300">Open Loop</span> <span className="text-slate-500">- Question raised, answered later</span></div>
              <div><span className="text-slate-300">Social Proof</span> <span className="text-slate-500">- Others' experiences</span></div>
              <div><span className="text-slate-300">Future Pacing</span> <span className="text-slate-500">- Vivid outcome description</span></div>
              <div><span className="text-slate-300">Scarcity</span> <span className="text-slate-500">- Limited availability</span></div>
              <div><span className="text-slate-300">Authority</span> <span className="text-slate-500">- Credentials, experience</span></div>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <span className="text-amber-400 font-medium">Key Question:</span>
          <span className="text-slate-300 ml-2">"What story is being told, and how?"</span>
        </div>
      </div>

      {/* Output Format */}
      <div className="p-6 bg-slate-900 border border-emerald-500/30 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-xl font-semibold text-white m-0">Output Format</h2>
        </div>
        <p className="text-slate-400 mb-4">For each significant moment/section:</p>

        <div className="font-mono text-sm bg-slate-800 p-4 rounded-lg text-slate-300">
          <div className="mb-3">
            <span className="text-blue-400">1. INFORMATION THEORY</span><br />
            <span className="text-slate-500 ml-4">Signal: [what concept]</span><br />
            <span className="text-slate-500 ml-4">Mode: [redundant/complementary/primary]</span><br />
            <span className="text-slate-500 ml-4">Channel logic: [why this channel]</span>
          </div>
          <div className="mb-3">
            <span className="text-rose-400">2. HUMAN NATURE</span><br />
            <span className="text-slate-500 ml-4">Trigger: [desire/fear activated]</span><br />
            <span className="text-slate-500 ml-4">Purpose: [cognitive work being done]</span><br />
            <span className="text-slate-500 ml-4">Emotion: [feeling created]</span>
          </div>
          <div className="mb-3">
            <span className="text-amber-400">3. LITERARY DEVICE</span><br />
            <span className="text-slate-500 ml-4">Device: [technique used]</span><br />
            <span className="text-slate-500 ml-4">Function: [role in narrative]</span>
          </div>
          <div>
            <span className="text-emerald-400">4. TRANSFERABLE INSIGHT</span><br />
            <span className="text-slate-500 ml-4">[One-line principle applicable to ANY content]</span>
          </div>
        </div>
      </div>

      {/* Ultimate Question */}
      <div className="mt-8 p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl text-center">
        <p className="text-lg text-white font-medium">The Ultimate Question</p>
        <p className="text-purple-300 mt-2">
          "What subject-agnostic principle is being applied here that works for ANY content?"
        </p>
      </div>
    </div>
  );
}

// Content Principles Playbook (placeholder)
function ContentPrinciplesPlaybook() {
  return (
    <div className="prose prose-invert prose-slate max-w-none">
      <p className="text-slate-400">Add your core content principles here...</p>

      <div className="mt-8 p-6 bg-slate-900 border border-slate-800 rounded-xl">
        <h3 className="text-white mt-0">Coming Soon</h3>
        <p className="text-slate-400 mb-0">
          This playbook is ready to be filled with your content principles.
        </p>
      </div>
    </div>
  );
}
