import { Hero } from "../components/Hero";
import { Products } from "../components/Products";
import { DataSources } from "../components/DataSources";
import { CodeSection } from "../components/CodeSection";
import { Philosophy } from "../components/Philosophy";
import { Faq } from "../components/Faq";
import { Footer } from "../components/Footer";

export function Home() {
  return (
    <div className="min-h-screen">
      <main>
        <Hero />
        <Products />
        <DataSources />
        <CodeSection />
        <Philosophy />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
