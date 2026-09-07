import wordListPath from 'word-list';
import {words as popularWords} from 'popular-english-words';
import {readFileSync,writeFileSync} from 'node:fs';
const words=[...new Set([...readFileSync(wordListPath,'utf8').split('\n'),'balls'].filter(w=>/^[a-z]{2,24}$/.test(w)).map(w=>w.toUpperCase()))];
writeFileSync('public/words.json',JSON.stringify(words));
const common=[...new Set(popularWords.getMostPopular(50000).filter(word=>/^[a-z]{2,24}$/.test(word)).map(word=>word.toUpperCase()))];
writeFileSync('public/common-words.json',JSON.stringify(common));
console.log(`Bundled ${words.length} English words and ${common.length} frequency ranks.`);
