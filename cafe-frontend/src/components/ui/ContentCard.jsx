import { useState } from 'react';
import { getImageUrl } from '../../utils/imageHelper';

/**
 * Bagian konten editorial dengan tata letak bergantian (gambar kiri/kanan).
 */
const ContentCard = ({ block, index }) => {
    const [expanded, setExpanded] = useState(false);
    const reversed = index % 2 === 1;
    const image = block.image_url || block.image_path;
    const long = (block.body || '').length > 420;

    return (
        <section className="grid md:grid-cols-2 gap-10 md:gap-20 items-center">
            <div className={`${reversed ? 'md:order-2' : ''}`}>
                {image ? (
                    <img src={getImageUrl(image)} alt={block.title || ''} loading="lazy" className="w-full aspect-[4/5] md:aspect-[5/6] object-cover rounded-3xl" />
                ) : (
                    <div className="w-full aspect-[4/5] rounded-3xl bg-surface-container" />
                )}
            </div>
            <div className={`${reversed ? 'md:order-1' : ''}`}>
                {block.section_name && (
                    <p className="label-caps text-primary mb-5 flex items-center gap-4"><span className="h-px w-8 bg-primary/60" />{block.section_name}</p>
                )}
                {block.title && <h2 className="font-display text-4xl md:text-5xl leading-[1.1] tracking-[-0.01em] text-ink whitespace-pre-line">{block.title}</h2>}
                {block.body && (
                    <>
                        <p className={`mt-6 text-lg text-on-surface-variant leading-[1.8] whitespace-pre-wrap ${expanded || !long ? '' : 'line-clamp-6'}`}>{block.body}</p>
                        {long && (
                            <button onClick={() => setExpanded((v) => !v)} className="mt-5 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink border-b border-primary pb-1 hover:text-primary">
                                {expanded ? 'Tutup' : 'Baca selengkapnya'}
                            </button>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

export default ContentCard;
