import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { Input } from '@/components/ui/input';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (inputValue?: string) => void;
  variant?: 'default' | 'destructive';
  isInput?: boolean;
  inputPlaceholder?: string;
}

/**
 * 确认对话框组件
 * 用于替代原生的 confirm() 对话框
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title = '确认操作',
  description,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  variant = 'default',
  isInput = false,
  inputPlaceholder = '请输入...',
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = React.useState('');

  const handleConfirm = () => {
    onConfirm(isInput ? inputValue : undefined);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
          {isInput && (
            <div className="mt-4">
              <Input 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)} 
                placeholder={inputPlaceholder}
                className="rounded-xl"
                autoFocus
              />
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setInputValue('')}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * 使用 Promise 的确认对话框
 * 用法：
 * const confirmed = await confirmAsync('确定要删除吗？');
 * if (confirmed) { ... }
 */
let confirmResolve: ((value: any) => void) | null = null;
let confirmState: {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  variant: 'default' | 'destructive';
  isInput: boolean;
  inputPlaceholder: string;
  defaultInputValue?: string;
} = {
  open: false,
  title: '确认操作',
  description: '',
  confirmText: '确认',
  cancelText: '取消',
  variant: 'default',
  isInput: false,
  inputPlaceholder: '请输入...',
  defaultInputValue: '',
};

const confirmListeners = new Set<() => void>();

function notifyListeners() {
  confirmListeners.forEach(listener => listener());
}

export function useConfirmDialog() {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  React.useEffect(() => {
    confirmListeners.add(forceUpdate);
    return () => {
      confirmListeners.delete(forceUpdate);
    };
  }, []);

  return confirmState;
}

export function confirmAsync(
  description: string | { title?: string; description?: string; confirmText?: string; cancelText?: string; variant?: 'default' | 'destructive'; isInput?: boolean; inputPlaceholder?: string; defaultInputValue?: string; },
  options?: {
    title?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    isInput?: boolean;
    inputPlaceholder?: string;
    defaultInputValue?: string;
  }
): Promise<boolean | string> {
  const finalDescription = typeof description === 'string' ? description : description.description || '';
  const finalOptions = typeof description === 'string' ? options : description;

  return new Promise((resolve) => {
    confirmResolve = resolve;
    confirmState = {
      open: true,
      title: finalOptions?.title || '确认操作',
      description: finalDescription,
      confirmText: finalOptions?.confirmText || '确认',
      cancelText: finalOptions?.cancelText || '取消',
      variant: finalOptions?.variant || 'default',
      isInput: finalOptions?.isInput || false,
      inputPlaceholder: finalOptions?.inputPlaceholder || '请输入...',
      defaultInputValue: finalOptions?.defaultInputValue || '',
    };
    notifyListeners();
  });
}

export function ConfirmDialogProvider() {
  const state = useConfirmDialog();
  const [inputValue, setInputValue] = React.useState('');

  React.useEffect(() => {
    if (state.open) {
      setInputValue(state.defaultInputValue || '');
    } else {
      setInputValue('');
    }
  }, [state.open, state.defaultInputValue]);

  const handleConfirm = () => {
    if (confirmResolve) {
      if (state.isInput) {
        confirmResolve(inputValue);
      } else {
        confirmResolve(true);
      }
      confirmResolve = null;
    }
    confirmState.open = false;
    notifyListeners();
  };

  const handleCancel = () => {
    if (confirmResolve) {
      confirmResolve(false);
      confirmResolve = null;
    }
    confirmState.open = false;
    notifyListeners();
  };

  return (
    <AlertDialog open={state.open} onOpenChange={(open) => !open && handleCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-wrap">{state.description}</AlertDialogDescription>
          {state.isInput && (
            <div className="mt-4">
              <Input 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)} 
                placeholder={state.inputPlaceholder}
                className="rounded-xl"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirm();
                }}
              />
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>{state.cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={state.variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {state.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
