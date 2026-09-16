"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "@/contexts/AccountContext";
import {
  StickyNote,
  Plus,
  Lightbulb,
  Eye,
  CheckSquare,
  FileText,
  Sparkles,
  Link2,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import type { StrategyNote, NoteType } from "@/lib/types/post";

// Type configuration
const noteTypeConfig: Record<
  NoteType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }
> = {
  idea: {
    label: "Idea",
    icon: Lightbulb,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20 border-amber-500/30",
  },
  observation: {
    label: "Observation",
    icon: Eye,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20 border-blue-500/30",
  },
  action: {
    label: "Action",
    icon: CheckSquare,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20 border-emerald-500/30",
  },
  note: {
    label: "Note",
    icon: FileText,
    color: "text-slate-400",
    bgColor: "bg-slate-500/20 border-slate-500/30",
  },
};

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: { content: string; type: NoteType; linkedInsightId?: string; linkedPostId?: string }) => Promise<void>;
  editNote?: StrategyNote | null;
}

function NoteModal({ isOpen, onClose, onSave, editNote }: NoteModalProps) {
  const [content, setContent] = useState("");
  const [type, setType] = useState<NoteType>("note");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editNote) {
      setContent(editNote.content);
      setType(editNote.type);
    } else {
      setContent("");
      setType("note");
    }
  }, [editNote, isOpen]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await onSave({
        content: content.trim(),
        type,
        linkedInsightId: editNote?.linkedInsightId,
        linkedPostId: editNote?.linkedPostId,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">
            {editNote ? "Edit Note" : "New Note"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Type</label>
            <div className="flex gap-2">
              {(Object.keys(noteTypeConfig) as NoteType[]).map((t) => {
                const config = noteTypeConfig[t];
                const Icon = config.icon;
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                      type === t
                        ? `${config.bgColor} ${config.color}`
                        : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content textarea */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note..."
              rows={5}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || saving}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editNote ? "Save Changes" : "Create Note"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotesPage() {
  const { currentAccount } = useAccount();
  const [notes, setNotes] = useState<StrategyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<StrategyNote | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!currentAccount) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/${currentAccount.id}/notes`);
      const data = await res.json();
      if (data.data) {
        setNotes(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setLoading(false);
    }
  }, [currentAccount]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSaveNote = async (noteData: {
    content: string;
    type: NoteType;
    linkedInsightId?: string;
    linkedPostId?: string;
  }) => {
    if (!currentAccount) return;

    if (editingNote?._id) {
      // Update existing
      await fetch(`/api/accounts/${currentAccount.id}/notes/${editingNote._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteData),
      });
    } else {
      // Create new
      await fetch(`/api/accounts/${currentAccount.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteData),
      });
    }

    setEditingNote(null);
    fetchNotes();
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!currentAccount) return;
    setDeletingId(noteId);
    try {
      await fetch(`/api/accounts/${currentAccount.id}/notes/${noteId}`, {
        method: "DELETE",
      });
      fetchNotes();
    } finally {
      setDeletingId(null);
    }
  };

  const openNewNote = () => {
    setEditingNote(null);
    setModalOpen(true);
  };

  const openEditNote = (note: StrategyNote) => {
    setEditingNote(note);
    setModalOpen(true);
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  if (!currentAccount) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">Select an account to view notes</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
            <StickyNote className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Strategy Notes</h1>
            <p className="text-sm text-slate-400">
              Capture ideas, observations, and action items
            </p>
          </div>
        </div>
        <button
          onClick={openNewNote}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-5 h-5" />
          New Note
        </button>
      </div>

      {/* Notes List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
            <StickyNote className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No notes yet</h3>
          <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
            Start capturing your strategy ideas, observations from insights, and action items.
          </p>
          <button
            onClick={openNewNote}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create your first note
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const config = noteTypeConfig[note.type];
            const Icon = config.icon;
            const noteId = note._id?.toString() || "";

            return (
              <div
                key={noteId}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-all group"
              >
                <div className="flex items-start gap-4">
                  {/* Type icon */}
                  <div
                    className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${config.bgColor}`}
                  >
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${config.bgColor} ${config.color}`}
                          >
                            {config.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(note.createdAt)}
                          </span>
                        </div>
                        <p className="text-white whitespace-pre-wrap">{note.content}</p>

                        {/* Links */}
                        {(note.linkedInsightId || note.linkedPostId) && (
                          <div className="flex items-center gap-3 mt-3">
                            {note.linkedInsightId && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                                <Sparkles className="w-3 h-3" />
                                Linked to insight
                              </span>
                            )}
                            {note.linkedPostId && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-blue-400">
                                <Link2 className="w-3 h-3" />
                                Linked to post
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditNote(note)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(noteId)}
                          disabled={deletingId === noteId}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === noteId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note Modal */}
      <NoteModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingNote(null);
        }}
        onSave={handleSaveNote}
        editNote={editingNote}
      />
    </div>
  );
}
