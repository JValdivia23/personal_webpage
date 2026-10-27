import { BentoGrid, BentoGridItem } from "@/components/ui/BentoGrid";
import { Hero } from "@/components/Hero";
import { DissertationSlides } from "@/components/DissertationSlides";
import { FeaturedVisual } from "@/components/FeaturedVisual";
import { ReadingList } from "@/components/ReadingList";
import { Download, CloudRain, Cpu, BarChart3, ArrowRight, Cloud, FileText } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-black p-4 md:p-8 font-[family-name:var(--font-sans)]">
      <BentoGrid className="max-w-4xl mx-auto md:auto-rows-[auto] gap-6">
        {/* Row 1: Hero */}
        <BentoGridItem
          title={null}
          description={null}
          header={<Hero />}
          className="md:col-span-3 bg-gradient-to-br from-blue-50 via-purple-50/30 to-transparent dark:from-blue-950/20 dark:via-purple-950/10 dark:to-transparent border-none justify-center min-h-fit"
        />

        {/* Row 2a: Dissertation Slides */}
        <BentoGridItem
          title={null}
          description={null}
          header={<DissertationSlides />}
          className="md:col-span-3 p-0 border-none bg-transparent"
        />

        {/* Row 2b: Featured Visual (CTGC) */}
        <BentoGridItem
          title={null}
          description={null}
          header={<FeaturedVisual />}
          className="md:col-span-3 p-0 border-none bg-transparent"
        />

        {/* Row 3: Research Focus Areas */}
        <div className="md:col-span-3">
             <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-6">
                Research Focus
             </h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* Card 1: Cloud Microphysics */}
                 <Link href="/research#ctgc" className="group flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-neutral-800 dark:bg-zinc-900/50 dark:hover:border-blue-900/50">
                    <div>
                        <Cloud className="mb-3 h-8 w-8 text-sky-500" />
                        <h3 className="mb-2 font-bold text-neutral-800 dark:text-neutral-100">Cloud Microphysics</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Investigating precipitation formation mechanisms and microphysical processes in clouds.
                        </p>
                    </div>
                    <div className="mt-4 flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 opacity-0 transition-opacity group-hover:opacity-100">
                        Learn more <ArrowRight className="ml-1 h-4 w-4" />
                    </div>
                 </Link>

                 {/* Card 2: Signal Processing */}
                 <Link href="/research#radar-dct" className="group flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-neutral-800 dark:bg-zinc-900/50 dark:hover:border-blue-900/50">
                    <div>
                        <BarChart3 className="mb-3 h-8 w-8 text-blue-500" />
                        <h3 className="mb-2 font-bold text-neutral-800 dark:text-neutral-100">Signal Processing</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Weather radar signal processing techniques.  Advanced noise removal in spectral domain using Discrete Cosine Transform.
                        </p>
                    </div>
                    <div className="mt-4 flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 opacity-0 transition-opacity group-hover:opacity-100">
                        Learn more <ArrowRight className="ml-1 h-4 w-4" />
                    </div>
                 </Link>

                 {/* Card 4: Climate Modeling */}
                 <Link href="/research#climate-modeling" className="group flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-neutral-800 dark:bg-zinc-900/50 dark:hover:border-blue-900/50">
                    <div>
                        <CloudRain className="mb-3 h-8 w-8 text-teal-500" />
                        <h3 className="mb-2 font-bold text-neutral-800 dark:text-neutral-100">Climate Modeling</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Evolution of precipitation types in climate warming scenarios and potential solutions using CESM.
                        </p>
                    </div>
                    <div className="mt-4 flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 opacity-0 transition-opacity group-hover:opacity-100">
                        Learn more <ArrowRight className="ml-1 h-4 w-4" />
                    </div>
                 </Link>

                 {/* Card 3: Machine Learning */}
                 <Link href="/research#chess-bot" className="group flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-neutral-800 dark:bg-zinc-900/50 dark:hover:border-blue-900/50">
                    <div>
                        <Cpu className="mb-3 h-8 w-8 text-indigo-500" />
                        <h3 className="mb-2 font-bold text-neutral-800 dark:text-neutral-100">Machine Learning</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                             PyTorch implementations of neural networks.
                        </p>
                    </div>
                    <div className="mt-4 flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 opacity-0 transition-opacity group-hover:opacity-100">
                        Learn more <ArrowRight className="ml-1 h-4 w-4" />
                    </div>
                 </Link>
              
             </div>
        </div>

        {/* Row 4: Reading List */}
        <div className="md:col-span-3">
             <ReadingList />
        </div>

        {/* Row 5: CV Access */}
        <BentoGridItem
          title={
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <Link href="/cv" className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all shadow-md active:scale-95">
                 View Online <FileText className="w-4 h-4" />
               </Link>
               <a href="/personal_webpage/cv.pdf" download className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-blue-200 dark:border-blue-800 bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 font-bold text-sm hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all">
                 Download PDF <Download className="w-4 h-4" />
               </a>
            </div>
          }
          description="Get the full academic curriculum vitae (PDF)."
          className="md:col-span-3 h-auto py-8 bg-blue-50 dark:bg-slate-900/50 border-blue-100 dark:border-blue-900/50 items-center justify-center text-center"
        />

      </BentoGrid>

      <footer className="mt-12 flex items-center justify-center gap-6 pb-8">
        <div className="text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Jairo M. Valdivia
        </div>
      </footer>
    </main>
  );
}
