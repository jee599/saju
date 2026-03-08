"use client";

import type { Element, FourPillars } from "@saju/engine-saju";
import { STEM_ELEMENT, BRANCH_ELEMENT, STEM_POLARITY } from "@saju/engine-saju";

const STEM_TO_ELEMENT = STEM_ELEMENT;
const BRANCH_TO_ELEMENT = BRANCH_ELEMENT;

export default function FourPillarsTable({ pillars, dayMaster, t, locale }: { pillars: FourPillars; dayMaster: Element; t: (key: string) => string; locale: string }) {
  const cols = [
    { label: t("pillarsTable.cols.0"), sub: t("pillarsTable.colsSub.0"), pillar: pillars.hour, idx: 0 },
    { label: t("pillarsTable.cols.1"), sub: t("pillarsTable.colsSub.1"), pillar: pillars.day, idx: 1 },
    { label: t("pillarsTable.cols.2"), sub: t("pillarsTable.colsSub.2"), pillar: pillars.month, idx: 2 },
    { label: t("pillarsTable.cols.3"), sub: t("pillarsTable.colsSub.3"), pillar: pillars.year, idx: 3 },
  ];

  return (
    <div className="fourPillarsTableWrap">
    <table className="fourPillarsTable" role="table" aria-label={t("pillarsTable.aria")}>
      <thead>
        <tr>
          <th></th>
          {cols.map((col) => (
            <th key={col.idx} className={col.idx === 1 ? "pillarHighlightCol" : ""}>
              {col.label}<span className="pillarSubLabel">{col.sub}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr className="pillarRowStem">
          <td className="pillarRowLabel">{t("pillarsTable.stemRow")}</td>
          {cols.map((col) => {
            const stemEl = STEM_TO_ELEMENT[col.pillar.stem] ?? "earth";
            const polarity = STEM_POLARITY[col.pillar.stem] ?? "yang";
            return (
              <td key={col.idx} className={col.idx === 1 ? "pillarHighlightCol" : ""}>
                <span className="pillarChar" style={{ color: `var(--element-${stemEl})` }}>{col.pillar.stem}</span>
                <span className="pillarPolTag">{t(`polarity.${polarity}`)}</span>
              </td>
            );
          })}
        </tr>
        <tr className="pillarRowBranch">
          <td className="pillarRowLabel">{t("pillarsTable.branchRow")}</td>
          {cols.map((col) => {
            const branchEl = BRANCH_TO_ELEMENT[col.pillar.branch] ?? "earth";
            return (
              <td key={col.idx} className={col.idx === 1 ? "pillarHighlightCol" : ""}>
                <span className="pillarChar" style={{ color: `var(--element-${branchEl})` }}>{col.pillar.branch}</span>
              </td>
            );
          })}
        </tr>
        {locale === "ko" && (
        <tr className="pillarRowKr">
          <td className="pillarRowLabel"></td>
          {cols.map((col) => (
            <td key={col.idx} className={col.idx === 1 ? "pillarHighlightCol" : ""}>
              <span className="pillarKrName">{col.pillar.fullKr}</span>
            </td>
          ))}
        </tr>
        )}
      </tbody>
    </table>
    </div>
  );
}
