import React, { useEffect, useRef, useState, useCallback } from "react";
import Chart from "chart.js/auto";
import { useCalculator } from "../contexts/CalculatorContext";
import Card from "./ui/Card";
import { ArrowsExpandIcon, ArrowsShrinkIcon } from "./Icons";
import { getChartColor, CHART_COLORS } from "../lib/chartUtils";

const reorderDataForLocalTime = (data: number[], offset: number): number[] => {
  if (!data) return Array(24).fill(0);
  return Array.from(
    { length: 24 },
    (_, i) => data[(i - offset + 24) % 24] || 0,
  );
};

const InternalGainsChart: React.FC = () => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { state, theme } = useCalculator();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"sources" | "sensible_latent">(
    "sources",
  );

  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [handleFullscreenChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.resize();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    const element = chartContainerRef.current;
    if (!element) return;
    try {
      if (!document.fullscreenElement) {
        await element.requestFullscreen();
        if (window.screen.orientation && window.innerWidth < 1024) {
          await (window.screen.orientation as any)
            .lock("landscape")
            .catch((e: any) =>
              console.warn("Screen orientation lock failed:", e),
            );
        }
      } else {
        if (document.exitFullscreen) {
          if (
            window.screen.orientation &&
            window.screen.orientation.type.startsWith("landscape")
          ) {
            window.screen.orientation.unlock();
          }
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error(
        `Error with fullscreen API: ${(err as Error).message}`,
        err,
      );
    }
  };

  useEffect(() => {
    if (!chartRef.current || !state.activeResults) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      return;
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const month = parseInt(state.currentMonth, 10);
    const isSummerTime = month >= 4 && month <= 10;
    const offset = isSummerTime ? 2 : 1;

    const labels = Array.from(
      { length: 24 },
      (_, i) => `${String(i).padStart(2, "0")}:00`,
    );
    const isDarkMode = theme === "dark";
    const gridColor = isDarkMode
      ? "rgba(255, 255, 255, 0.1)"
      : "rgba(0, 0, 0, 0.1)";
    const textColor = isDarkMode ? "#ecf0f1" : "#333";

    const { internalGainsLoad, finalGains } = state.activeResults;
    const resultData = finalGains.clearSky;

    let datasets: any[] = [];

    if (viewMode === "sources") {
      const sumPeopleLatent = resultData.peopleLatent || Array(24).fill(0);
      const peopleTotal = (resultData.people || Array(24).fill(0)).map(
        (v, i) => v + sumPeopleLatent[i],
      );

      datasets = [
        {
          label: "Ludzie",
          data: reorderDataForLocalTime(peopleTotal, offset),
          backgroundColor: CHART_COLORS.people,
          stack: "a",
        },
        {
          label: "Oświetlenie",
          data: reorderDataForLocalTime(
            resultData.lighting || Array(24).fill(0),
            offset,
          ),
          backgroundColor: CHART_COLORS.lighting,
          stack: "a",
        },
        {
          label: "Urządzenia",
          data: reorderDataForLocalTime(
            resultData.equipment || Array(24).fill(0),
            offset,
          ),
          backgroundColor: CHART_COLORS.equipment,
          stack: "a",
        },
      ];
    } else {
      datasets = [
        {
          label: "Obciążenie jawne",
          data: reorderDataForLocalTime(internalGainsLoad.sensible, offset),
          backgroundColor: getChartColor("internal", false),
          stack: "a",
        },
        {
          label: "Obciążenie utajone",
          data: reorderDataForLocalTime(internalGainsLoad.latent, offset),
          backgroundColor: getChartColor("internal", true),
          borderColor: CHART_COLORS.internal,
          borderWidth: 1,
          stack: "a",
        },
      ];
    }

    const chartConfig: any = {
      type: "bar",
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        scales: {
          x: {
            title: {
              display: true,
              text: `Godzina (czas lokalny)`,
              color: textColor,
            },
            ticks: { color: textColor },
            grid: { color: gridColor },
            stacked: true,
          },
          y: {
            title: {
              display: true,
              text: "Obciążenie chłodnicze (W)",
              color: textColor,
            },
            ticks: { color: textColor },
            grid: { color: gridColor },
            stacked: true,
            beginAtZero: true,
          },
        },
        plugins: {
          title: {
            display: true,
            text: "Godzinowe obciążenie chłodnicze od zysków wewnętrznych",
            color: textColor,
            font: { size: 16 },
          },
          legend: { labels: { color: textColor } },
          tooltip: {
            mode: "index",
            callbacks: {
              label: function (context: any) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  label += Math.round(context.parsed.y) + " W";
                }
                return label;
              },
              footer: (tooltipItems: any[]) => {
                let sum = 0;
                tooltipItems.forEach((tooltipItem) => {
                  sum += tooltipItem.parsed.y;
                });
                return "Suma: " + Math.round(sum) + " W";
              },
            },
          },
        },
      },
    };

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = new Chart(ctx, chartConfig);
    } else {
      chartInstanceRef.current = new Chart(ctx, chartConfig);
    }
  }, [state.activeResults, theme, state.currentMonth, viewMode]);

  if (!state.results) {
    return (
      <Card className="flex items-center justify-center h-full min-h-[400px]">
        <p className="text-slate-500 text-center px-4">
          Przejdź do zakładki "Podsumowanie" i uruchom obliczenia, aby zobaczyć
          wykres obciążenia chłodniczego.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <div
        className={`relative w-full bg-white dark:bg-slate-900 rounded-lg ${isFullscreen ? 'h-screen p-4 flex flex-col' : 'h-[400px]'}`}
        ref={chartContainerRef}
      >
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-slate-100/50 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title={
              isFullscreen ? "Wyjdź z trybu pełnoekranowego" : "Pełny ekran"
            }
          >
            {isFullscreen ? (
              <ArrowsShrinkIcon className="w-5 h-5" />
            ) : (
              <ArrowsExpandIcon className="w-5 h-5" />
            )}
          </button>
        </div>
        <div className="relative w-full flex-grow h-full">
            <canvas ref={chartRef}></canvas>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-md border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewMode("sources")}
            className={`px-3 py-1 text-sm font-medium rounded ${viewMode === "sources" ? "bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
          >
            Źródła zysków
          </button>
          <button
            onClick={() => setViewMode("sensible_latent")}
            className={`px-3 py-1 text-sm font-medium rounded ${viewMode === "sensible_latent" ? "bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
          >
            Jawne / Utajone
          </button>
        </div>
      </div>
    </Card>
  );
};

export default InternalGainsChart;
