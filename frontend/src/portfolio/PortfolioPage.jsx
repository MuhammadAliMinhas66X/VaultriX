import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './portfolio.css';
import Nav, { scrollToId } from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import ProductStory from './components/ProductStory.jsx';
import Flow from './components/Flow.jsx';
import Trust from './components/Trust.jsx';
import Security from './components/Security.jsx';
import Bento from './components/Bento.jsx';
import Founder from './components/Founder.jsx';
import Footer from './components/Footer.jsx';

const TITLE = 'Vaultrix | Every rupee, accounted for';
const DESCRIPTION = 'Vaultrix tracks your income, daily expenses and loans in one private place. No data is shared between organizations.';

function PortfolioPage() {
  const location = useLocation();

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
    document.documentElement.classList.add('pf-snap');
    return () => {
      document.title = previousTitle;
      document.documentElement.classList.remove('pf-snap');
      if (created) meta.remove();
      else if (previousDescription !== null) meta.setAttribute('content', previousDescription);
    };
  }, []);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll('.pf main > section')).filter((el) => el.querySelector(':scope > .pf-focus-body'));
    if (typeof IntersectionObserver === 'undefined') return undefined;
    sections.forEach((el) => el.setAttribute('data-pf-focus', 'off'));
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.target.setAttribute('data-pf-focus', entry.isIntersecting ? 'on' : 'off')),
      { rootMargin: '-28% 0px -28% 0px' }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!location.hash) return undefined;
    const id = location.hash.slice(1);
    const timer = setTimeout(() => scrollToId(id, false), 450);
    return () => clearTimeout(timer);
  }, [location.hash]);

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
        <Bento />
        <Founder />
      </main>
      <Footer />
    </div>
  );
}

export default PortfolioPage;
