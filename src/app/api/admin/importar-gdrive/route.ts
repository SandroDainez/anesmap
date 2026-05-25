import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth";

type GDriveFile = { id: string; type: "doc" | "slides" | "sheets" };

function extractGoogleId(url: string): GDriveFile | null {
  // Google Docs: /document/d/{ID}/
  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) return { id: docMatch[1], type: "doc" };

  // Google Slides: /presentation/d/{ID}/
  const slidesMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slidesMatch) return { id: slidesMatch[1], type: "slides" };

  // Google Sheets: /spreadsheets/d/{ID}/
  const sheetsMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetsMatch) return { id: sheetsMatch[1], type: "sheets" };

  return null;
}

export async function POST(request: NextRequest) {
  const ctx = await checkAdminAccess();
  if (!ctx) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  let body: { url?: string };
  try {
    body = await request.json() as { url?: string };
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const { url } = body;
  if (!url?.trim()) {
    return NextResponse.json({ error: "URL obrigatória." }, { status: 400 });
  }

  const parsed = extractGoogleId(url.trim());
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "URL do Google Drive não reconhecida. Use links do Google Docs, Slides ou Sheets.",
      },
      { status: 400 }
    );
  }

  // Build export URL based on document type
  const exportUrl =
    parsed.type === "doc"
      ? `https://docs.google.com/document/d/${parsed.id}/export?format=txt`
      : parsed.type === "slides"
      ? `https://docs.google.com/presentation/d/${parsed.id}/export/txt`
      : `https://docs.google.com/spreadsheets/d/${parsed.id}/export?format=csv`;

  try {
    const resp = await fetch(exportUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AnesMap/1.0; +https://anesmap.com.br)",
      },
      redirect: "follow",
    });

    if (!resp.ok) {
      if (resp.status === 403 || resp.status === 401) {
        return NextResponse.json(
          {
            error:
              "Documento não está público. Compartilhe como \"Qualquer pessoa com o link pode visualizar\".",
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: `Erro ao acessar o documento (HTTP ${resp.status}).` },
        { status: 502 }
      );
    }

    const texto = await resp.text();
    if (!texto.trim()) {
      return NextResponse.json(
        { error: "Documento vazio ou sem texto extraível." },
        { status: 422 }
      );
    }

    return NextResponse.json({ texto: texto.trim(), tipo: parsed.type });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Erro ao buscar documento do Google Drive.",
        detalhe: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
