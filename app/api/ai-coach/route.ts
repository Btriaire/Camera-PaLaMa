import { NextResponse } from "next/server";

export const maxDuration = 15;

export interface AiCoachResponse {
  sceneType: "portrait" | "landscape" | "street" | "night" | "macro" | "architecture" | "retro" | "general";
  compositionAdvice: string;
  recommendedFilmId: string;
  recommendedFilmName: string;
  filmReason: string;
  lightingStatus: "optimal" | "backlit" | "lowlight" | "harsh" | "diffused";
  exposureCorrectionEv: number;
}

const PRESET_MAP: Record<string, { id: string; name: string }> = {
  "portra-400": { id: "portra-400", name: "Kodak Portra 400" },
  "portra-160": { id: "portra-160", name: "Kodak Portra 160" },
  "portra-800": { id: "portra-800", name: "Kodak Portra 800" },
  "ektar-100": { id: "ektar-100", name: "Kodak Ektar 100" },
  "kodachrome-64": { id: "kodachrome-64", name: "Kodachrome 64" },
  "fuji-velvia-50": { id: "fuji-velvia-50", name: "Fujichrome Velvia 50" },
  "fuji-provia-100f": { id: "fuji-provia-100f", name: "Fujichrome Provia 100F" },
  "fuji-pro-400h": { id: "fuji-pro-400h", name: "Fujicolor Pro 400H" },
  "tri-x-400": { id: "tri-x-400", name: "Kodak Tri-X 400" },
  "ilford-hp5": { id: "ilford-hp5", name: "Ilford HP5 Plus" },
  "leica-monochrom": { id: "leica-monochrom", name: "Leica M Monochrom" },
  "cinestill-800t": { id: "cinestill-800t", name: "CineStill 800T" },
  "cinestill-50d": { id: "cinestill-50d", name: "CineStill 50D" },
  "polaroid-sx70": { id: "polaroid-sx70", name: "Polaroid SX-70 Time-Zero" },
  "hasselblad-x2d-100c": { id: "hasselblad-x2d-100c", name: "Hasselblad X2D 100C" },
  "mamiya-rb67": { id: "mamiya-rb67", name: "Mamiya RB67 Pro-S" },
  "xpan-panoramic": { id: "xpan-panoramic", name: "Hasselblad XPan II 45mm" },
};

export async function POST(req: Request) {
  try {
    const { imageBase64, currentPresetId } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json({ error: "Image base64 manquante" }, { status: 400 });
    }

    const systemPrompt = `Tu es un grand maître directeur de la photographie et expert argentique mondial.
Tu analyses un cadrage photo en direct.
Réponds STRICTEMENT par un JSON valide (sans markdown, sans backticks, sans texte autour) avec le schéma suivant :
{
  "sceneType": "portrait" | "landscape" | "street" | "night" | "macro" | "architecture" | "retro" | "general",
  "compositionAdvice": "Conseil concis max 7 mots en francais pour ameliorer la photo",
  "recommendedFilmId": "identifiant exact parmi: portra-400, portra-160, portra-800, ektar-100, kodachrome-64, fuji-velvia-50, fuji-provia-100f, fuji-pro-400h, tri-x-400, ilford-hp5, leica-monochrom, cinestill-800t, cinestill-50d, polaroid-sx70, hasselblad-x2d-100c, mamiya-rb67, xpan-panoramic",
  "filmReason": "Explication experte courte (max 8 mots)",
  "lightingStatus": "optimal" | "backlit" | "lowlight" | "harsh" | "diffused",
  "exposureCorrectionEv": 0.0
}`;

    const userPrompt = `Analyse cette prise de vue live. Preset actuel : ${currentPresetId || "standard"}. Donne le diagnostic de cadrage et le film argentique parfait.`;

    let aiResult: AiCoachResponse | null = null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);

    try {
      const vpsRes = await fetch("http://46.202.131.240:9999/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `${systemPrompt}\n\n${userPrompt}`,
          project: "camera-palama",
        }),
        signal: controller.signal,
      });

      if (vpsRes.ok) {
        const vpsData = await vpsRes.json();
        const textOutput = vpsData.answer || vpsData.response || JSON.stringify(vpsData);
        
        const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const filmId = PRESET_MAP[parsed.recommendedFilmId] ? parsed.recommendedFilmId : "portra-400";
          aiResult = {
            sceneType: parsed.sceneType || "portrait",
            compositionAdvice: parsed.compositionAdvice || "Stabilisez et soignez la ligne d'horizon",
            recommendedFilmId: filmId,
            recommendedFilmName: PRESET_MAP[filmId]?.name || "Kodak Portra 400",
            filmReason: parsed.filmReason || "Tons chair soyeux et douceur du grain",
            lightingStatus: parsed.lightingStatus || "optimal",
            exposureCorrectionEv: typeof parsed.exposureCorrectionEv === "number" ? parsed.exposureCorrectionEv : 0.0,
          };
        }
      }
    } catch {
      // VPS fallback heuristique
    } finally {
      clearTimeout(timeout);
    }

    if (!aiResult) {
      aiResult = generateHeuristicAdvice(currentPresetId);
    }

    return NextResponse.json(aiResult);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erreur interne";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

function generateHeuristicAdvice(currentPresetId?: string): AiCoachResponse {
  const heuristics: Array<{
    sceneType: AiCoachResponse["sceneType"];
    compositionAdvice: string;
    recommendedFilmId: string;
    filmReason: string;
    lightingStatus: AiCoachResponse["lightingStatus"];
    exposureCorrectionEv: number;
  }> = [
    {
      sceneType: "portrait",
      compositionAdvice: "Placez le regard sur le tiers supérieur",
      recommendedFilmId: "portra-400",
      filmReason: "Tonalités chair naturelles et modelé doux",
      lightingStatus: "optimal",
      exposureCorrectionEv: 0.0,
    },
    {
      sceneType: "landscape",
      compositionAdvice: "Alignez l'horizon sur la grille",
      recommendedFilmId: "fuji-velvia-50",
      filmReason: "Saturation profonde des verts et ciels",
      lightingStatus: "optimal",
      exposureCorrectionEv: -0.3,
    },
    {
      sceneType: "street",
      compositionAdvice: "Anticipez le mouvement du sujet",
      recommendedFilmId: "tri-x-400",
      filmReason: "Noir et blanc contrasté au grain vivant",
      lightingStatus: "harsh",
      exposureCorrectionEv: +0.3,
    },
    {
      sceneType: "night",
      compositionAdvice: "Cadrez les sources lumineuses ponctuelles",
      recommendedFilmId: "cinestill-800t",
      filmReason: "Halo rougeoyant cinématographique sur les lumières",
      lightingStatus: "lowlight",
      exposureCorrectionEv: +0.7,
    },
    {
      sceneType: "retro",
      compositionAdvice: "Privilégiez les angles graphiques épurés",
      recommendedFilmId: "kodachrome-64",
      filmReason: "Couleurs chaudes et velouté vintage iconique",
      lightingStatus: "diffused",
      exposureCorrectionEv: 0.0,
    },
  ];

  const candidate = heuristics.find((h) => h.recommendedFilmId !== currentPresetId) || heuristics[0];
  const filmInfo = PRESET_MAP[candidate.recommendedFilmId] || { id: "portra-400", name: "Kodak Portra 400" };

  return {
    ...candidate,
    recommendedFilmName: filmInfo.name,
  };
}
