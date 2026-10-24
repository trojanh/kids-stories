const fs = require('fs');
const path = require('path');

const STORIES_PATH = path.join(__dirname, '..', 'src', 'data', 'stories.json');

const animals = [
  'elephant','lion','tiger','monkey','giraffe','zebra','rabbit','fox','bear','deer','parrot','peacock','crocodile','squirrel','panther','hippo','kangaroo','panda','otter','koala'
];
const morals = [
  'friendship','courage','honesty','generosity','perseverance','patience','kindness','resourcefulness','humility','gratitude','teamwork','respect','curiosity','bravery','wisdom'
];

function randomChoice(arr){
  return arr[Math.floor(Math.random()*arr.length)];
}

function generateStory(index){
  const animal = randomChoice(animals);
  const moral = randomChoice(morals);
  const title = `The ${animal.charAt(0).toUpperCase()+animal.slice(1)} and the Lesson`;
  const sentences = [
    `In a bright Indian forest, a ${animal} was playing near a mango tree.`,
    `A little bird sang, "Beware of ${moral}."`,
    `The ${animal} laughed and continued its fun.`,
    `Soon, a problem appeared that required ${moral}.`,
    `With ${moral}, the ${animal} solved it and felt happy.`
  ];
  const wordCount = sentences.reduce((c,s)=>c + s.split(/\s+/).filter(Boolean).length,0);
  let length = 'short';
  if(wordCount > 80) length = 'long';
  else if(wordCount > 50) length = 'medium';
  const id = `${animal}_${index}`;
  const panels = Array.from({length:5}, (_,i)=> `${animal}_${i+1}.svg`);
  const tags = [animal, moral];
  return {
    id,
    title,
    theme: 'Animals',
    animal,
    tags,
    length,
    text: sentences,
    panels
  };
}

function main(){
  let existing = [];
  if(fs.existsSync(STORIES_PATH)){
    const raw = fs.readFileSync(STORIES_PATH, 'utf8');
    existing = JSON.parse(raw);
  }
  const newStories = [];
  const targetCount = 50;
  for(let i=0;i<targetCount;i++){
    newStories.push(generateStory(i));
  }
  const all = existing.concat(newStories);
  const formatted = JSON.stringify(all, null, 2);
  fs.writeFileSync(STORIES_PATH, formatted, 'utf8');
  console.log(`Added ${newStories.length} stories, total now ${all.length}`);
}

main();
