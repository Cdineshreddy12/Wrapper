"use client";
import { useScroll, useTransform } from "motion/react";
import React from "react";
import { ZopkitEcosystemEffect } from "@/components/ui/zopkit-ecosystem-effect";

export default function ZopkitEcosystemDemo() {
  const ref = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const pathLengthFirst = useTransform(scrollYProgress, [0, 0.8], [0, 1.2]);
  const pathLengthSecond = useTransform(scrollYProgress, [0, 0.8], [0, 1.2]);
  const pathLengthThird = useTransform(scrollYProgress, [0, 0.8], [0, 1.2]);
  const pathLengthFourth = useTransform(scrollYProgress, [0, 0.8], [0, 1.2]);
  const pathLengthFifth = useTransform(scrollYProgress, [0, 0.8], [0, 1.2]);

  return (
    <div
      className="h-[300vh] bg-gradient-to-b from-black via-gray-900 to-black w-full rounded-md relative pt-20 overflow-clip"
      ref={ref}
    >
      <ZopkitEcosystemEffect
        pathLengths={[
          pathLengthFirst,
          pathLengthSecond,
          pathLengthThird,
          pathLengthFourth,
          pathLengthFifth,
        ]}
        title="Connected Business Ecosystem"
        description="Watch how all your applications interconnect seamlessly. From CRM to Finance, HRMS to Operations - everything works together in perfect harmony."
      />
    </div>
  );
}
