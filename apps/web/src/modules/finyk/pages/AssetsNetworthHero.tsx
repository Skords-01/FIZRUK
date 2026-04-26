import { cn } from "@shared/lib/cn";
import { AssetsLiabilitiesBar } from "./AssetsBars";

interface AssetsNetworthHeroProps {
  networth: number;
  totalAssets: number;
  totalDebt: number;
  showBalance: boolean;
}

export function AssetsNetworthHero({
  networth,
  totalAssets,
  totalDebt,
  showBalance,
}: AssetsNetworthHeroProps) {
  return (
    <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 text-white rounded-2xl p-5 mb-3 border border-white/10 shadow-float">
      <div className="text-xs text-emerald-100/90 mb-1">Загальний нетворс</div>
      <div
        className={cn(
          "text-3xl font-extrabold tracking-tight",
          !showBalance && "tracking-widest",
        )}
      >
        {showBalance
          ? `${networth.toLocaleString("uk-UA", { maximumFractionDigits: 0 })} ₴`
          : "••••••"}
      </div>
      <div className="text-xs text-emerald-100/85 mt-1">
        {showBalance ? (
          <>
            Активи:{" "}
            {totalAssets.toLocaleString("uk-UA", {
              maximumFractionDigits: 0,
            })}{" "}
            ₴ · Пасиви: −
            {totalDebt.toLocaleString("uk-UA", {
              maximumFractionDigits: 0,
            })}{" "}
            ₴
          </>
        ) : (
          "Суми приховано"
        )}
      </div>
      {showBalance && totalAssets + totalDebt > 0 && (
        <AssetsLiabilitiesBar assets={totalAssets} liabilities={totalDebt} />
      )}
    </div>
  );
}
