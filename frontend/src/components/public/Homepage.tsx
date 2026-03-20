"use client";

import { useEffect } from "react";

import CTA from "@/components/public/sections/CTA";
import Features from "@/components/public/sections/Features";
import Footer from "@/components/public/sections/Footer";
import Hero from "@/components/public/sections/Hero";
import HowItWorks from "@/components/public/sections/HowItWorks";
import LiveFeed from "@/components/public/sections/LiveFeed";
import NavBar from "@/components/public/sections/NavBar";
import Ticker from "@/components/public/sections/Ticker";
import Voices from "@/components/public/sections/Voices";

export default function Homepage() {
  useEffect(() => {
    const revealNodes = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" },
    );

    revealNodes.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <NavBar />
      <Hero />
      <Ticker />
      <LiveFeed />
      <Features />
      <HowItWorks />
      <Voices />
      <CTA />
      <Footer />
    </>
  );
}
