import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  Gift,
  Heart,
  Lock,
  List,
  Play,
  Plus,
  ShareNetwork,
  Sparkle,
  Users,
  X,
} from "@phosphor-icons/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Logo, Page } from "../components/ui";
import { FloatingCelebration } from "../components/Celebration";

export function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.25], [0, reduce ? 0 : -34]);
  return (
    <Page className="site-page">
      <header className="nav wrap">
        <Logo />
        <nav
          className={menuOpen ? "open" : ""}
          onClick={() => setMenuOpen(false)}
        >
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <Link to="/auth">Sign in</Link>
          <Link className="button primary" to="/app/boards/new">
            Create a board <ArrowRight />
          </Link>
        </nav>
        <button
          className="mobile-menu-button"
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X /> : <List />}
          <span>Menu</span>
        </button>
        {menuOpen && (
          <button
            className="mobile-menu-scrim"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          />
        )}
      </header>
      <main>
        <section className="hero wrap">
          <motion.div className="hero-copy" style={{ y: heroY }}>
            <h1>
              Make your birthday
              <br />
              <em>feel like your day.</em>
            </h1>
            <p>
              One beautiful link for your birthday wishes, wishlist, photos, and
              gifts.
            </p>
            <div className="actions">
              <Link className="button primary" to="/app/boards/new">
                Create My Birthday Page <ArrowRight />
              </Link>
              <a className="button secondary" href="#how">
                <Play /> See How It Works
              </a>
            </div>
          </motion.div>
          <motion.div
            className="hero-board"
            initial={reduce ? false : { opacity: 0, scale: 0.94, rotate: 1.5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <FloatingCelebration />
            <div className="mini-cover">
              <div className="mini-top">
                <b>huraay</b>
                <span>
                  <ShareNetwork /> Share
                </span>
              </div>
              <div className="mini-person">
                <Heart />
              </div>
              <h3>Your celebration</h3>
              <p>Your date, your moment</p>
              <div className="mini-wishes">
                <small>New wishes appear here</small>
              </div>
            </div>
            <motion.div
              className="floating-wish"
              animate={reduce ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <div className="avatar tone-0">
                <Heart />
              </div>
              <div>
                <strong>A new wish arrived</strong>
                <p>Something meaningful is waiting...</p>
              </div>
              <span>🎉</span>
            </motion.div>
            <motion.div
              className="floating-gift"
              animate={reduce ? undefined : { y: [0, 7, 0] }}
              transition={{ duration: 4.8, repeat: Infinity }}
            >
              <Gift />
              <div>
                <small>Wishlist</small>
                <strong>Thoughtful gifts</strong>
              </div>
            </motion.div>
          </motion.div>
        </section>
        <section className="occasion-strip">
          <div>
            {[
              "Birthdays",
              "Weddings",
              "Graduations",
              "Farewells",
              "Anniversaries",
              "Baby showers",
            ].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>
        <section id="how" className="promise wrap">
          <p>One link for the people who matter.</p>
          <div className="promise-grid">
            <article>
              <span>01</span>
              <h2>Create your space</h2>
              <p>
                Choose the occasion, add a date, and make it feel completely
                yours.
              </p>
            </article>
            <article>
              <span>02</span>
              <h2>Share one simple link</h2>
              <p>
                Friends can leave something meaningful without creating an
                account.
              </p>
            </article>
            <article>
              <span>03</span>
              <h2>Keep it forever</h2>
              <p>
                Every thoughtful note and photo stays together in one lasting
                memory.
              </p>
            </article>
          </div>
        </section>
        <section id="features" className="feature-stage wrap">
          <div className="feature-copy">
            <span className="section-label">Thoughtful by design</span>
            <h2>Built around how people really celebrate.</h2>
            <p>
              Private words stay private. Surprises arrive at the right time.
              Every detail gives the sender and celebrant control.
            </p>
          </div>
          <div className="feature-bento">
            <article className="feature-large">
              <div className="privacy-demo">
                <Lock />
                <small>A private wish</small>
                <p>Some words are only meant for you.</p>
                <span>Only the celebrant can view this</span>
              </div>
              <h3>Privacy that feels simple</h3>
            </article>
            <article>
              <Heart />
              <h3>Wish cards</h3>
              <p>Messages, memories, and photos in one beautiful format.</p>
            </article>
            <article>
              <Gift />
              <h3>Wishlists</h3>
              <p>Make gifting thoughtful, useful, and duplicate-free.</p>
            </article>
            <article className="feature-wide">
              <div>
                <Users />
                <h3>Surprise boards</h3>
                <p>
                  Gather everyone quietly, then reveal it when the moment is
                  right.
                </p>
              </div>
              <div className="invite-stack">
                <span>
                  <Users />
                </span>
                <span>
                  <Heart />
                </span>
                <span>
                  <Sparkle />
                </span>
                <i>
                  <Check />
                </i>
              </div>
            </article>
          </div>
        </section>
        <section className="memory wrap">
          <div className="memory-copy">
            <span className="section-label">More than a moment</span>
            <h2>
              A celebration today.
              <br />A memory for years.
            </h2>
            <p>
              When the day is over, your board stays with you as a beautiful
              timeline of the people who showed up.
            </p>
            <Button variant="secondary">
              Explore memory books <ArrowRight />
            </Button>
          </div>
          <div className="memory-stack">
            <div className="memory-card one">
              <Camera />
              <span>Your photos</span>
            </div>
            <div className="memory-card two">
              <Heart />
              <p>Every meaningful message stays together.</p>
            </div>
            <div className="memory-card three">
              <Sparkle />
              <small>memories kept forever</small>
            </div>
          </div>
        </section>
        <section className="pricing wrap" id="pricing">
          <div className="pricing-head">
            <span className="section-label">Simple pricing</span>
            <h2>Start beautifully. Go Pro when it matters.</h2>
          </div>
          <div className="pricing-grid">
            <article>
              <span>Free</span>
              <h3>Everything you need for one birthday.</h3>
              <strong>₦0</strong>
              <ul>
                <li>
                  <Check /> 1 Birthday Page
                </li>
                <li>
                  <Check /> 5 birthday photos
                </li>
                <li>
                  <Check /> 5 wishlist items
                </li>
                <li>
                  <Check /> Public and private wishes
                </li>
                <li>
                  <Check /> WhatsApp gift coordination
                </li>
              </ul>
              <Link className="button secondary" to="/app/boards/new">
                Create My Page
              </Link>
            </article>
            <article className="pro">
              <span>Huraay Pro</span>
              <h3>More birthdays, more style, more insight.</h3>
              <strong>
                ₦2,000 <small>once</small>
              </strong>
              <p>One payment. No monthly subscription.</p>
              <ul>
                <li>
                  <Check /> Unlimited Birthday Pages
                </li>
                <li>
                  <Check /> Up to 15 photos per page
                </li>
                <li>
                  <Check /> Premium themes and custom colors
                </li>
                <li>
                  <Check /> Vanity URL and advanced analytics
                </li>
                <li>
                  <Check /> Remove Huraay branding
                </li>
              </ul>
              <Link className="button primary" to="/app/upgrade">
                Get Huraay Pro
              </Link>
            </article>
          </div>
        </section>
        <section className="faq wrap">
          <span className="section-label">Questions, answered</span>
          <h2>Good to know.</h2>
          {[
            [
              "Does my visitor need an account?",
              "No. Anyone with your link can leave a birthday wish.",
            ],
            [
              "When can visitors see my wishlist?",
              "Only after they successfully submit a birthday wish.",
            ],
            [
              "Is Huraay Pro a subscription?",
              "No. It is one ₦2,000 payment with no monthly subscription.",
            ],
            [
              "Will my page appear on Google?",
              "Birthday Pages default to noindex and are meant to be shared intentionally.",
            ],
          ].map(([q, a], index) => (
            <div
              className={`faq-item ${openFaq === index ? "open" : ""}`}
              key={q}
            >
              <button
                className="faq-question"
                type="button"
                aria-expanded={openFaq === index}
                aria-controls={`faq-answer-${index}`}
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              >
                <span>{q}</span>
                <motion.span
                  className="faq-plus"
                  animate={{ rotate: openFaq === index ? 45 : 0 }}
                  transition={{ duration: reduce ? 0 : 0.28 }}
                >
                  <Plus />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {openFaq === index && (
                  <motion.div
                    id={`faq-answer-${index}`}
                    className="faq-answer"
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      duration: reduce ? 0 : 0.34,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <p>{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </section>
        <section className="cta wrap">
          <div>
            <h2>Your birthday deserves its own place.</h2>
            <p>One link. Every wish, photo, wishlist item, and gift.</p>
          </div>
          <Link className="button primary" to="/app/boards/new">
            Create My Birthday Page <ArrowRight />
          </Link>
        </section>
      </main>
      <footer className="sleek-footer">
        <div className="sleek-footer-shell wrap">
          <div className="sleek-footer-brand">
            <div className="footer-logo">
              <Logo />
            </div>
            <h2>
              Keep the wishes.
              <br />
              Remember the feeling.
            </h2>
            <p>
              One beautiful place for every birthday message, wishlist, and
              gift.
            </p>
          </div>
          <div className="sleek-footer-links">
            <div>
              <span>Explore</span>
              <a href="#how">How it works</a>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div>
              <span>Account</span>
              <Link to="/auth">Sign in</Link>
              <Link to="/app/boards/new">
                Create a page <ArrowUpRight />
              </Link>
            </div>
            <div>
              <span>Legal</span>
              <a href="#features">Privacy</a>
              <a href="#features">Terms</a>
            </div>
          </div>
          <div className="sleek-footer-base">
            <span>Made for birthdays worth remembering.</span>
            <span>© 2026 Huraay</span>
          </div>
        </div>
      </footer>
    </Page>
  );
}
