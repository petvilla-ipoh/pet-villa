const ownerNotice = [
  "Vaccination and basic health proof are required before check-in.",
  "Please bring your dog's own food, snacks, bowl, leash, and comfort item.",
  "Tell us about allergies, medication, anxiety, or special habits before booking.",
  "Only small dogs from 1-12kg are accepted. No aggressive dogs or dogs with fleas.",
  "Any unexpected medical or emergency care costs are paid by the owner."
];

const testimonials = [
  {
    name: "Mei Ling",
    dog: "Mochi's owner",
    quote: "The daily photos made me feel calm. Mochi looked loved, relaxed, and never lonely."
  },
  {
    name: "Aisyah",
    dog: "Boba's owner",
    quote: "It felt like leaving my dog with family. The home was clean, cool, and gentle."
  },
  {
    name: "Daniel",
    dog: "Luna's owner",
    quote: "Clear booking, fast replies, and the 24h companionship was exactly what Luna needed."
  }
];

export default function HomePage() {
  return (
    <main className="homePage">
      <nav className="siteNav">
        <a className="logoLockup" href="#home" aria-label="The Pet Villa home">
          <span className="logoText">The Pet Villa</span>
          <span className="logoSub">Ipoh small dog boarding</span>
        </a>
        <div className="siteNavLinks" aria-label="Main navigation">
          <a href="#services">Services</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#gallery">Gallery</a>
          <a className="navCta" href="/booking">Book Now</a>
        </div>
      </nav>

      <section id="home" className="homeHero">
        <span className="pawDecor pawOne">🐾</span>
        <span className="pawDecor pawTwo">🐾</span>
        <div className="heroContent">
          <span className="eyebrow">The Pet Villa · Ipoh · Pet Boarding</span>
          <h1>A Home Away From Home</h1>
          <p className="heroSubtitle">Premium small dog boarding in Ipoh · No cages · 24h companionship</p>
          <div className="heroActions">
            <a className="button" href="/booking">Book a Stay</a>
            <a className="button ghost" href="#services">Learn More</a>
          </div>
          <div className="trustStrip" aria-label="Care promises">
            <span>1-12kg only</span>
            <span>Max 3 dogs daily</span>
            <span>24h air-conditioned</span>
          </div>
        </div>
        <div className="heroVisual" aria-label="Warm dog boarding illustration">
          <div className="sunBadge">24h care</div>
          <div className="villaPortrait">
            <div className="portraitWindow">
              <div className="dogFace">
                <span className="dogEar left" />
                <span className="dogEar right" />
                <span className="dogEye left" />
                <span className="dogEye right" />
                <span className="dogNose" />
                <span className="dogSmile" />
              </div>
            </div>
            <div className="softPillow">No cages, just comfort</div>
          </div>
        </div>
      </section>

      <section className="section warmBand">
        <div className="featureGrid">
          <article className="featureCard">
            <span className="featureIcon">🐾</span>
            <h2>No Cages Ever</h2>
            <p>Your dog roams free, relaxes in a real home, and sleeps with us.</p>
          </article>
          <article className="featureCard">
            <span className="featureIcon">📸</span>
            <h2>Daily Photo Updates</h2>
            <p>Receive 3-5 photos or videos every day, so you always know how your dog is doing.</p>
          </article>
          <article className="featureCard">
            <span className="featureIcon">❄️</span>
            <h2>24h Air-Conditioned</h2>
            <p>Comfortable indoor care day and night, especially for small dogs who need calm rest.</p>
          </article>
        </div>
      </section>

      <section id="services" className="section">
        <div className="sectionHeader centered">
          <span className="eyebrow">Services & Pricing</span>
          <h2>Simple pricing, gentle small-dog care</h2>
          <p>Choose overnight boarding or daycare. Every stay follows the same loving house rules.</p>
        </div>
        <div className="pricingGrid">
          <article className="priceCard">
            <span className="priceIcon">🌙</span>
            <h3>Overnight Boarding</h3>
            <div className="price">RM 40<span>/night</span></div>
            <p>Home-style overnight care with no cages, 24h companionship, same-room sleeping, and daily updates.</p>
            <a className="button" href="/booking">Book Now</a>
          </article>
          <article className="priceCard highlighted">
            <span className="priceIcon">☀️</span>
            <h3>Daycare</h3>
            <div className="price">RM 5<span>/hour</span></div>
            <p>Flexible daytime care from 9:00am to 8:00pm for eligible small dogs in a calm home.</p>
            <a className="button" href="/booking">Book Now</a>
          </article>
        </div>
      </section>

      <section id="how-it-works" className="section processSection">
        <div className="sectionHeader">
          <span className="eyebrow">How It Works</span>
          <h2>Book in four clear steps</h2>
          <p>From first message to check-in, the flow is easy to understand and safe for both owner and host.</p>
        </div>
        <div className="stepRow">
          {[
            ["①", "填写资料", "Tell us your dog’s weight, vaccine status, habits, and special needs."],
            ["②", "确认预约", "We check eligibility, dates, and the daily 3-dog capacity."],
            ["③", "付押金", "Pay the 50% deposit after your booking is confirmed."],
            ["④", "宠物入住", "Check in between 9:00am-8:00pm and receive daily updates."]
          ].map(([number, title, body]) => (
            <article className="stepCard" key={title}>
              <span className="stepNumber">{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section noticeSection">
        <div className="noticePanel">
          <div>
            <span className="eyebrow">Owner Notice</span>
            <h2>Before your dog stays with us</h2>
            <p>These simple rules protect every dog in the villa and keep the home calm, clean, and safe.</p>
          </div>
          <ul className="noticeList">
            {ownerNotice.map((item) => (
              <li key={item}><span>✓</span>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section id="gallery" className="section gallerySection">
        <div className="sectionHeader centered">
          <span className="eyebrow">Gallery</span>
          <h2>Warm little moments from the villa</h2>
          <p>Placeholder tiles for your real dog photos, room photos, and diary moments.</p>
        </div>
        <div className="galleryGrid">
          <div className="galleryTile peach">Nap time under AC</div>
          <div className="galleryTile green">Daily photo diary</div>
          <div className="galleryTile cream">Gentle indoor play</div>
        </div>
      </section>

      <section className="section testimonialsSection">
        <div className="sectionHeader centered">
          <span className="eyebrow">Happy Owners</span>
          <h2>Trusted by small-dog families</h2>
        </div>
        <div className="testimonialGrid">
          {testimonials.map((testimonial) => (
            <article className="testimonialCard" key={testimonial.name}>
              <div className="stars">★★★★★</div>
              <p>“{testimonial.quote}”</p>
              <div className="reviewer">
                <span className="avatarCircle">{testimonial.name.slice(0, 1)}</span>
                <div>
                  <strong>{testimonial.name}</strong>
                  <span>{testimonial.dog}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="finalCta">
        <span className="pawDecor ctaPaw">🐾</span>
        <h2>Ready to plan a safe, loving stay?</h2>
        <p>Send a booking request and we will confirm availability, eligibility, and next steps.</p>
        <a className="button" href="/booking">Book a Stay</a>
      </section>

      <footer className="siteFooter">
        <div className="footerBrand">
          <span className="logoText">The Pet Villa</span>
          <p>A Home Away From Home for small dog boarding in Ipoh.</p>
        </div>
        <div>
          <h3>Contact</h3>
          <p>WhatsApp: +60 XX-XXX XXXX</p>
          <p>Email: hello@thepetvilla.example</p>
        </div>
        <div>
          <h3>Hours</h3>
          <p>Check-in: 9:00am-8:00pm</p>
          <p>Check-out: before 12:00pm</p>
        </div>
        <div>
          <h3>Social</h3>
          <p>Instagram · Facebook · TikTok</p>
        </div>
      </footer>
    </main>
  );
}
