import { useEffect } from 'react';
import './portfolio.css';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import ProductStory from './components/ProductStory.jsx';
import Flow from './components/Flow.jsx';
import Trust from './components/Trust.jsx';
import Security from './components/Security.jsx';
import Details from './components/Details.jsx';
import Founder from './components/Founder.jsx';
import Cta from './components/Cta.jsx';
import Footer from './components/Footer.jsx';

const TITLE = 'Vaultrix | Every rupee, accounted for';
const DESCRIPTION = 'Vaultrix tracks your income, daily expenses and loans in one private place. No data is shared between organizations.';

function PortfolioPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = TITLE;
    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    if (created) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    const previousDescription = meta.getAttribute('content');
    meta.setAttribute('content', DESCRIPTION);
    return () => {
      document.title = previousTitle;
      if (created) meta.remove();
      else if (previousDescription !== null) meta.setAttribute('content', previousDescription);
    };
  }, []);

  return (
    <div className="pf min-h-screen">
      <a href="#product" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <Nav />
      <main>
        <Hero />
        <ProductStory />
        <Flow />
        <Trust />
        <Security />
        <Details />
        <Founder />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}

export default PortfolioPage;
