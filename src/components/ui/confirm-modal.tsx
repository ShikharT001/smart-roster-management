"use client";

import React from "react";
import { Modal } from "./modal";
import { Button } from "./button";
import { AlertTriangle, AlertCircle } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  canDelete?: boolean;
  dependencyDetails?: string[];
  confirmText?: string;
  isPending?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  canDelete = true,
  dependencyDetails = [],
  confirmText = "Delete",
  isPending = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          {canDelete && (
            <Button
              variant="danger"
              size="sm"
              onClick={onConfirm}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : confirmText}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3 py-1">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded flex-shrink-0 ${
              canDelete
                ? "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                : "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
            }`}
          >
            {canDelete ? <AlertTriangle size={18} /> : <AlertCircle size={18} />}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-foreground">{message}</p>
            {!canDelete && (
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                Action blocked to protect operational scheduling integrity.
              </p>
            )}
          </div>
        </div>

        {dependencyDetails.length > 0 && (
          <div className="mt-2 p-2.5 bg-surface-muted border border-border rounded text-xs">
            <span className="font-semibold text-foreground block mb-1">
              Referenced Dependencies:
            </span>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-400">
              {dependencyDetails.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};
