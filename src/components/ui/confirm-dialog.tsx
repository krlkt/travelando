'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** When set, the confirm button is disabled until the user types this string exactly. */
  requiredInput?: string;
  requiredInputLabel?: string;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  requiredInput,
  requiredInputLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('');

  const canConfirm = !requiredInput || inputValue === requiredInput;

  function handleOpenChange(next: boolean) {
    if (!next) setInputValue('');
    onOpenChange(next);
  }

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm();
    setInputValue('');
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {requiredInput && (
          <div className="mt-4 flex flex-col gap-2">
            <Label htmlFor="confirm-input" className="text-sm">
              {requiredInputLabel ?? (
                <>
                  Type{' '}
                  <span className="text-foreground font-medium">
                    {requiredInput}
                  </span>{' '}
                  to confirm
                </>
              )}
            </Label>
            <Input
              id="confirm-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
              }}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
