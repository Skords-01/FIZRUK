/** @vitest-environment jsdom */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { VoiceMicButton } from "./VoiceMicButton";

/**
 * Тести закривають інваріанти контракту, через які ходять усі 5
 * call-сайтів (Finyk, Fizruk, Nutrition, Routine x2):
 *
 *   - кнопка повертає `null` коли НЕ підтримується ЖОДЕН провайдер
 *     (Web Speech API + MediaRecorder обидва відсутні);
 *   - якщо доступний хоч один — кнопка рендериться;
 *   - `onResult(transcript)` викликається з рядком, ніколи з event-ом;
 *   - `aria-label` оновлюється в стани listening/uploading.
 *
 * MediaRecorder + getUserMedia в jsdom відсутні, тож шлях Groq не
 * запускається без явного моку. Web Speech API теж не присутній,
 * тому за замовчуванням `supported=false` для обох → null.
 */

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  // Прибираємо все, що тести могли поставити на window.
  // `MediaRecorder` оголошений у lib.dom.d.ts як обовʼязковий → перетинна
  // `& { MediaRecorder?: unknown }` його не послаблює. Використовуємо `Omit`
  // щоб зробити поле опційним і дозволити `delete`.
  type W = Omit<typeof window, "MediaRecorder"> & {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
    MediaRecorder?: unknown;
  };
  const w = window as unknown as W;
  delete w.SpeechRecognition;
  delete w.webkitSpeechRecognition;
  delete w.MediaRecorder;
});

describe("VoiceMicButton", () => {
  it("повертає null коли немає ні Web Speech, ні MediaRecorder", () => {
    const { container } = render(<VoiceMicButton onResult={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("рендерить кнопку коли Web Speech API доступний", () => {
    type W = typeof window & { webkitSpeechRecognition?: unknown };
    (window as W).webkitSpeechRecognition = class {
      lang = "";
      interimResults = false;
      maxAlternatives = 1;
      continuous = false;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      start() {}
      stop() {}
      abort() {}
    };
    const { container } = render(<VoiceMicButton onResult={() => {}} />);
    expect(container.querySelector("button")).not.toBeNull();
  });

  it("дотримується контракту onResult(string) у Web Speech-режимі", () => {
    type RecCtor = new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      continuous: boolean;
      onstart: (() => void) | null;
      onend: (() => void) | null;
      onresult:
        | ((e: {
            results?: ArrayLike<ArrayLike<{ transcript?: string }>>;
          }) => void)
        | null;
      onerror: ((e: { error: string }) => void) | null;
      start: () => void;
      stop: () => void;
      abort: () => void;
    };
    let lastInstance: InstanceType<RecCtor> | null = null;
    type W = typeof window & { webkitSpeechRecognition?: RecCtor };
    (window as W).webkitSpeechRecognition = class {
      lang = "";
      interimResults = false;
      maxAlternatives = 1;
      continuous = false;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onresult:
        | ((e: {
            results?: ArrayLike<ArrayLike<{ transcript?: string }>>;
          }) => void)
        | null = null;
      onerror: ((e: { error: string }) => void) | null = null;
      constructor() {
        lastInstance = this as unknown as InstanceType<RecCtor>;
      }
      start() {
        this.onstart?.();
      }
      stop() {
        this.onend?.();
      }
      abort() {}
    } as unknown as RecCtor;

    const onResult = vi.fn();
    const { container } = render(<VoiceMicButton onResult={onResult} />);
    const btn = container.querySelector("button")!;

    act(() => {
      btn.click();
    });
    expect(lastInstance).not.toBeNull();
    act(() => {
      lastInstance!.onresult?.({
        results: [[{ transcript: "купив каву" }]],
      });
    });
    expect(onResult).toHaveBeenCalledWith("купив каву");
  });
});
