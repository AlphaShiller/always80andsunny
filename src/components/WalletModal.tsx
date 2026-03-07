"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useCallback, useEffect } from "react";

const COLORS = {
  purple: "#9945FF",
  teal: "#14F195",
  cardBg: "#1A1333",
  lightText: "#B8B8D0",
  midGray: "#6B6B8D",
};

export function useWalletModal() {
  const [visible, setVisible] = useState(false);
  return { visible, setVisible };
}

export function WalletModalButton({
  walletModal,
}: {
  walletModal: { visible: boolean; setVisible: (v: boolean) => void };
}) {
  const { publicKey, disconnect, connected } = useWallet();

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : "";

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="px-3 py-1.5 rounded-lg text-xs font-mono"
          style={{ backgroundColor: "#0D3B2E", color: COLORS.teal }}
        >
          {shortAddress}
        </div>
        <button
          onClick={disconnect}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border cursor-pointer"
          style={{ borderColor: "#FF4444", color: "#FF4444" }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => walletModal.setVisible(true)}
      className="px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium border cursor-pointer transition-all hover:opacity-80"
      style={{ borderColor: COLORS.purple, color: COLORS.purple }}
    >
      Connect Wallet
    </button>
  );
}

export function WalletModal({
  walletModal,
}: {
  walletModal: { visible: boolean; setVisible: (v: boolean) => void };
}) {
  const { wallets, select, connect, connected } = useWallet();
  const [connecting, setConnecting] = useState(false);

  // Close modal when connected
  useEffect(() => {
    if (connected) {
      setConnecting(false);
      walletModal.setVisible(false);
    }
  }, [connected, walletModal]);

  const handleSelect = useCallback(
    async (walletName: string) => {
      try {
        setConnecting(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        select(walletName as any);
        // Need a small delay for select to register, then connect
        await new Promise((r) => setTimeout(r, 100));
        await connect();
      } catch (err) {
        console.error("Wallet connection error:", err);
        setConnecting(false);
      }
    },
    [select, connect]
  );

  if (!walletModal.visible) return null;

  const installedWallets = wallets.filter(
    (w) => w.readyState === "Installed"
  );
  const otherWallets = wallets.filter(
    (w) => w.readyState !== "Installed"
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={() => walletModal.setVisible(false)}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-sm mx-4 border"
        style={{ backgroundColor: "#150F28", borderColor: "#2D2550" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-white font-bold text-lg">Connect Wallet</h3>
          <button
            onClick={() => walletModal.setVisible(false)}
            className="text-2xl cursor-pointer leading-none"
            style={{ color: COLORS.midGray }}
          >
            &times;
          </button>
        </div>

        {installedWallets.length > 0 && (
          <div className="mb-4">
            <p className="text-xs mb-2" style={{ color: COLORS.midGray }}>
              Detected Wallets
            </p>
            <div className="space-y-2">
              {installedWallets.map((wallet) => (
                <button
                  key={wallet.adapter.name}
                  onClick={() => handleSelect(wallet.adapter.name)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:border-purple-500"
                  style={{
                    backgroundColor: COLORS.cardBg,
                    borderColor: "#2D2550",
                  }}
                >
                  {wallet.adapter.icon && (
                    <img
                      src={wallet.adapter.icon}
                      alt={wallet.adapter.name}
                      width={32}
                      height={32}
                      className="rounded-lg"
                    />
                  )}
                  <span className="text-white font-medium text-sm">
                    {wallet.adapter.name}
                  </span>
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#0D3B2E", color: COLORS.teal }}
                  >
                    Installed
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {installedWallets.length === 0 && (
          <div
            className="rounded-xl p-4 mb-4 text-center border"
            style={{ backgroundColor: "#2D1B3D", borderColor: COLORS.purple }}
          >
            <p className="text-sm mb-2" style={{ color: COLORS.lightText }}>
              No wallet detected
            </p>
            <a
              href="https://phantom.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: COLORS.purple }}
            >
              Install Phantom Wallet
            </a>
          </div>
        )}

        {otherWallets.length > 0 && (
          <div>
            <p className="text-xs mb-2" style={{ color: COLORS.midGray }}>
              Other Wallets
            </p>
            <div className="space-y-2">
              {otherWallets.map((wallet) => (
                <button
                  key={wallet.adapter.name}
                  onClick={() => handleSelect(wallet.adapter.name)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:border-purple-500"
                  style={{
                    backgroundColor: COLORS.cardBg,
                    borderColor: "#2D2550",
                  }}
                >
                  {wallet.adapter.icon && (
                    <img
                      src={wallet.adapter.icon}
                      alt={wallet.adapter.name}
                      width={32}
                      height={32}
                      className="rounded-lg"
                    />
                  )}
                  <span className="text-white font-medium text-sm">
                    {wallet.adapter.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {connecting && (
          <div className="text-center py-2">
            <p className="text-xs animate-pulse" style={{ color: COLORS.purple }}>
              Connecting... approve in your wallet
            </p>
          </div>
        )}

        <p className="text-xs mt-4 text-center" style={{ color: COLORS.midGray }}>
          Connected to Solana Devnet
        </p>
      </div>
    </div>
  );
}
