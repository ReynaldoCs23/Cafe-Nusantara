/** Judul halaman publik bergaya editorial: eyebrow kapital, judul serif, garis tipis. */
const PageIntro = ({ eyebrow, title, description, align = 'left', children }) => (
    <header className={`max-w-7xl mx-auto px-5 md:px-10 pt-16 md:pt-24 pb-10 md:pb-14 ${align === 'center' ? 'text-center' : ''}`}>
        {eyebrow && (
            <p className={`label-caps text-primary mb-5 flex items-center gap-4 ${align === 'center' ? 'justify-center' : ''}`}>
                <span className="h-px w-8 bg-primary/60" />{eyebrow}
            </p>
        )}
        <h1 className="font-display text-[44px] md:text-[64px] leading-[1.05] tracking-[-0.02em] text-ink">{title}</h1>
        {description && (
            <p className={`mt-5 text-lg text-on-surface-variant leading-relaxed max-w-2xl ${align === 'center' ? 'mx-auto' : ''}`}>{description}</p>
        )}
        {children}
    </header>
);

export default PageIntro;
