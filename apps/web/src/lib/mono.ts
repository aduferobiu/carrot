"use client";

type MonoConnectConfig = {
  key: string;
  scope: string;
  data: { customer: { name: string; email: string } };
  reference: string;
  onSuccess: (data: { code: string }) => void;
  onClose?: () => void;
  onLoad?: () => void;
  onEvent?: (eventName: string, data: unknown) => void;
};

type MonoConnectInstance = {
  setup: () => void;
  open: () => void;
};

type MonoConnectConstructor = new (config: MonoConnectConfig) => MonoConnectInstance;

export async function openMonoConnect(opts: {
  customer: { name: string; email: string };
  onSuccess: (code: string) => void;
  onClose?: () => void;
}) {
  const publicKey = process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("Missing NEXT_PUBLIC_MONO_PUBLIC_KEY");
  }

  const mod = await import("@mono.co/connect.js");
  const Connect = mod.default as unknown as MonoConnectConstructor;

  const connect = new Connect({
    key: publicKey,
    scope: "auth",
    data: { customer: opts.customer },
    reference: `carrot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    onSuccess: ({ code }) => opts.onSuccess(code),
    onClose: opts.onClose,
  });

  connect.setup();
  connect.open();
}
