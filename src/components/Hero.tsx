import { Github, Linkedin, Mail } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export const Hero = () => {
    return (
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 h-full justify-center py-8">
            {/* Photo Section */}
            <div className="flex-shrink-0">
                <div className="w-[250px] h-[250px] md:w-[300px] md:h-[300px] rounded-2xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center overflow-hidden border-2 border-neutral-300 dark:border-neutral-700 shadow-lg">
                    <Image 
                        src="/personal_webpage/photo.jpeg" 
                        alt="Jairo M. Valdivia" 
                        width={300} 
                        height={300} 
                        className="object-cover w-full h-full" 
                    />
                </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col space-y-6 max-w-2xl">
                <div>
                    <h1 className="text-2xl md:text-4xl font-bold text-neutral-800 dark:text-neutral-100 leading-tight">
                        Welcome to Jairo's Webpage
                    </h1>
                </div>

                <div className="space-y-4 text-neutral-700 dark:text-neutral-300 text-lg md:text-xl leading-relaxed">
                    <p>
                        I recently completed my Ph.D. in the Department of Atmospheric and Oceanic Sciences at the University of Colorado Boulder.
                    </p>
                    <p>
                        My research is focused on Cloud Microphysics, Radar Meteorology, and Numerical Modeling to better understand precipitation processes in complex terrain. I am also interested in Machine Learning applications in Atmospheric Science, or just for fun!
                    </p>
                </div>

                {/* Social Icons */}
                <div className="flex flex-wrap gap-4">
                    <Link
                        href="https://github.com/JValdivia23"
                        target="_blank"
                        className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all hover:scale-110"
                        aria-label="GitHub"
                    >
                        <Github className="w-6 h-6 text-neutral-700 dark:text-neutral-300" />
                    </Link>
                    <Link
                        href="https://www.linkedin.com/in/jairo-valdivia-prado-07755b1a6/"
                        target="_blank"
                        className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all hover:scale-110"
                        aria-label="LinkedIn"
                    >
                        <Linkedin className="w-6 h-6 text-neutral-700 dark:text-neutral-300" />
                    </Link>
                    <a
                        href="mailto:jairo.valdivia@colorado.edu"
                        className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all hover:scale-110"
                        aria-label="Email"
                    >
                        <Mail className="w-6 h-6 text-neutral-700 dark:text-neutral-300" />
                    </a>
                </div>
            </div>
        </div>
    );
};
