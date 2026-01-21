import React from 'react';
import { useDictionary } from '../DictionaryContext';
import DictionaryTooltip from './DictionaryTooltip';

const RichText = ({ content }) => {
    const { dictionary } = useDictionary();

    if (!content) return null;
    if (!dictionary || dictionary.length === 0) return <span>{content}</span>;

    // Sort dictionary words by length descending
    const sortedWords = [...dictionary].sort((a, b) => b.word.length - a.word.length);
    
    // Escape regex characters
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Separate short and long words
    const exactMatches = sortedWords.filter(w => w.word.length <= 3).map(w => escapeRegExp(w.word));
    const prefixMatches = sortedWords.filter(w => w.word.length > 3).map(w => escapeRegExp(w.word));

    const partsRegex = [];
    if (prefixMatches.length > 0) {
        // Matches boundary + word + optional hungarian/english letters
        partsRegex.push(`\\b(?:${prefixMatches.join('|')})[a-zA-ZáéíóöőúüűÁÉÍÓÖŐÚÜŰ]*`);
    }
    if (exactMatches.length > 0) {
        partsRegex.push(`\\b(?:${exactMatches.join('|')})\\b`);
    }

    if (partsRegex.length === 0) return <span>{content}</span>;

    const pattern = new RegExp(`(${partsRegex.join('|')})`, 'gi');

    const parts = content.split(pattern);

    return (
        <span style={{ whiteSpace: 'pre-wrap' }}>
            {parts.map((part, index) => {
                const lowerPart = part.toLowerCase();
                
                // Find matching dictionary entry
                // 1. Try exact match
                let dictEntry = dictionary.find(d => d.word.toLowerCase() === lowerPart);

                // 2. Try prefix match (for words > 3 chars)
                if (!dictEntry) {
                    // We need to find the longest dictionary word that is a prefix of this part
                    // Since sortedWords is sorted by length DESC, the first match is the longest prefix.
                    dictEntry = sortedWords.find(d => 
                        d.word.length > 3 && 
                        lowerPart.startsWith(d.word.toLowerCase())
                    );
                }

                if (dictEntry) {
                    return <DictionaryTooltip key={index} word={part} definition={dictEntry.definition} />;
                }
                return part;
            })}
        </span>
    );
};

export default RichText;
