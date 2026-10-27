import { ArrowRight } from 'lucide-react';

export const DissertationSlides = () => {
    return (
        <div className="relative h-full w-full min-h-[200px] flex flex-col justify-end overflow-hidden rounded-xl bg-neutral-950 group border border-[#CFB87C]/20">
             {/* Gold-tinted background accents */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#CFB87C_0%,_transparent_50%)] opacity-15 transition-opacity duration-500 group-hover:opacity-25" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#3a3325_1px,transparent_1px),linear-gradient(to_bottom,#3a3325_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />

            {/* Content */}
            <div className="relative z-10 p-6">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-[#CFB87C]/10 px-2 py-1 text-xs font-medium text-[#CFB87C] ring-1 ring-inset ring-[#CFB87C]/30">
                        Ph.D. Dissertation Defense
                    </span>
                    <span className="text-xs text-gray-400">15 October 2026 &middot; CU Boulder ATOC</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                    Observations of Cloud-Top Generating Cells
                </h3>
                <p className="text-sm text-gray-300 max-w-2xl mb-4">
                    Ph.D. dissertation defense, Department of Atmospheric and Oceanic Sciences, University of Colorado Boulder, presented 15 October 2026.
                </p>
                <a
                    href="https://JValdivia23.github.io/dissertation-slides/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-semibold text-[#CFB87C] hover:text-[#e0c88f] transition-colors"
                >
                    View Slides <ArrowRight className="ml-1 h-4 w-4" />
                </a>
            </div>
        </div>
    );
};
