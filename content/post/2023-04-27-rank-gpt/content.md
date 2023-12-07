+++
title = "Ranking Anything with GPT4"
date = 2023-04-30
author = "Binal Patel"
tags = ["nlp", "gpt4", "llm"]
categories = ["coding"]
+++

I've been fascinated by this paper: [Is ChatGPT Good at Search? Investigating Large Language Models as Re-Ranking Agent](https://arxiv.org/abs/2304.09542) and have been trying out the ideas with success in a few personal projects.

They essentially found that GPT4 is excellent at ranking things. Given a set of items (candidates) and some query it can rank these items very well (as well as or better than the current SOTA models for the benchmarks they evaluated).

They focused on benchmarks that include text only data (i.e. passages, news articles, etc), but I've found that the same ranking prompts work well for pretty much everything, and more so the ranking can take other attributes into account, things like tags, genres, user ratings, languages, and so on. 

<font size=2>

> Essentially anything that you can represent as text, you can include as additional context for ranking. 

> With existing models (and GPT4's image input whenever that comes out) you could even concievably use generated image descriptions if you have images . 

</font>

### Why is this useful?

The prevailing workflow right now for including external data for LLM inference is to get it from some external data store (vector store, database, website HTML, etc) and stuff it into the prompt as context without any additional evaluation, ranking, or filtering.

So from call to call you could be getting great context, or low quality context, or some mixture of the two. This effects your final outcome since the model will rely heavily on whatever data your provided to do what you asked.

Here's a quick example of adding in a ranker to the above workflow; if you want to just see output jump to the last section.

1. [Grab some interesting data.](#dataset)
2. [Generate a set of candidate games for a given query.](#candidate-generation)
3. [Rank these games via the methods proposed in that paper.](#ranking)

### Dataset

For demo data, I'm using this [Steam Games Dataset](https://www.kaggle.com/datasets/fronkongames/steam-games-dataset), an example of it below.

```
{'name': 'Royal Battleships',
 'release_date': 'Apr 6, 2018',
 'required_age': 0,
 'price': 2.99,
 'dlc_count': 0,
 'detailed_description': "Special Offer About the Game Sometimes there is nothing better than a tourney in a classic battleships game. You can see a beautifully designed sea battle, familiar to those from your school times. You have to play against the computer and you need to destroy all enemy ships before yours are destroyed. Features: Very beautiful graphics Classic game You can compete with your friends Supporting all platforms (Windows, Mac, Linux, SteamOS) A lot of Steam achievements The gameplay is very simple. When you are preparing for the match, there are some ships of different sizes - from simple battle boat to a huge battleship. You put them on the battlefield and nobody else than you knows their location. Of course, don't know the enemy's positions neither. Thus the battle is absolutely fair and you can only guess where to shoot. Of course, if you hit a battleship for the first time, it will be easy to find the other tiles. However, finding all enemy boats can be a real challenge. Do not forget that this game is not about speed, but about variety, so that the battle is always different. The game perfectly develops strategic thinking and will be useful to both adults and children. In addition, it will help you to plunge into nostalgia for simple classic games. ",
 'short_description': 'Royal Battleships is a classic sea battle game, which includes battles against the AI and battles for points. Destroy the enemy fleet and try to make yours survive.',
 ...(truncated)...
}
```
### Candidate Generation

For this example, I embedded each game's `detailed_description` via OpenAI's `text-embedding-ada-002` model.

Then for a given query I embed it as well, and find the nearest embeddings to it via cosine similarity.

<font size=2>

> There's a million different ways we could generae candidates in reality, and often we generating candidates using multiple different methods and combining ther results.
><br>For example:
>- text data: I could use BM25, or vector search, or a simple keyword search, etc. I could take the top 10 results from each and combine them into a set of candidates
>- social: I could look at new posts that my users' friends posted/liked, I could look at what posts users demographically similar to my user liked, etc.
>- ecommerce: I could look at the brands my user often buys and look at popular products, or include products that are trends in their geo, etc.

> The general idea is you're using a relatively low-compute method to generate a set of candidates that *may* be relevant to the user.

</font>

### Ranking

For each candidate game I take a subset of the fields, add an `index` field that just matches the index of where it's located in the list, and dump the list of dicts as a json string for the `context_string` below.

Here's the ranker function, the prompts below are modified versions of prompts from the paper I referenced above. 

<font size=2>

> One thing to notice - modifying the prompt can modify the ranking, so I can do things like tell the model to ignore certain attributes, or put more weight on other attributes. 

> Here I tell GPT4 that if there are multiple equally relevant games for a rank, then use the number of positive votes as a tie breaker.

</font>

```python
def ranker(games, user_query):

    system_message = {"role": "system", "content": "You are RankGPT, an intelligent assistant that can rank games based on how helpful they would be to the user."}
    context_string = format_games(games)

    prompt = f"""
    I will provide you with {len(games)} games, each indicated by number `index` field.
    Rank the games based on their relevance to query: {user_query}.

    {context_string}

    Search Query: {user_query}.
    
    Rank the {len(games)} games above based on their relevance to the search query.
    Use all the information available to you to rank the games.
    The games should be listed in descending order using identifiers. 
    The most relevant games should be listed first. If multiple games are equally relevant, use the number of positive votes as a tie-breaker.
    The output format should be a list of identifiers, separated by commas and enclosed in square brackets.
    Only output the list of identifiers, do not output any other text.
    """

    modified_user_message = {'role': 'user', 'content': prompt}

    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[system_message, modified_user_message],
        stream = False,
        temperature=0.7,
    )

    ranked_order = json.loads(response.choices[0].message.content)

    return ranked_order
```

Let's try it out. I'll use the same query for both candidate generation and and ranking to make things simple, but they could be different (and should probably be different in real usage).

Here's a few example queries with tables of the ranked games, along with the original rank (so what index the game was in the candidate set prior to ranking).

[I'm looking for games with lots of intrigue and lore. I want to be able to explore a world and find out more about it](#im-looking-for-games-with-lots-of-intrigue-and-lore-i-want-to-be-able-to-explore-a-world-and-find-out-more-about-it)

[I'm looking for satirical JRPG games](#im-looking-for-satirical-jrpg-games)

[I'm looking for soothing, mediative games](#im-looking-for-soothing-mediative-games)

[I'm looking for a game like Zelda, but with more action and less puzzles](#im-looking-for-a-game-like-zelda-but-with-more-action-and-less-puzzles)


___

#### I'm looking for games with lots of intrigue and lore. I want to be able to explore a world and find out more about it.
```python
query = '''I'm looking for games with lots of intrigue and lore. I want to be able to explore a world and find out more about it.'''
games = get_games(query, 10)
ranked_order = ranker(games, query)
```
<div style="font-size: 12px; height: 300px; overflow: auto;">

| Original Rank | Name                   | Short Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | +     | -   |
|---------------|------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------|-----|
| 1             | GreedFall              | Engage in a core roleplaying experience, and forge the destiny of a new world seeping with magic, and filled with riches, lost secrets, and fantastic creatures. With diplomacy, deception and force, become part of a living, evolving world - influence its course and shape your story.                                                                                                                                                                                                                   | 12218 | 3404|
| 2             | Rift Drifter           | Explore a lost and abandoned temple and find what secrets lie within. Rift Drifter is a 2D action-adventure platformer, with Metroidvania and RPG elements, a rich story, and a hint of souls-like combat.                                                                                                                                                                                                                                                                                                       | 7     | 2   |
| 5             | Horizon Odyssey        | Born into a world of stone and stifling rules, Mathias must search out a better future for himself and others. But what reason could there be to limit the exploration to the world above? And are these rules out of love or fear? Join Mathias on a classic JRPG journey to better himself and the world.                                                                                                                                                                                                      | 2     | 0   |
| 8             | SpellMaster: The Saga  | SpellMaster - The Saga is an RPG inspired by the Gothic series, which combines adventure with the construction and management of a magical academy. Gameplay takes place in an open, seamless world filled with secrets, mysteries, terrible monsters, and varied NPCs.                                                                                                                                                                                                                                                                     | 137   | 199 |
| 9             | Crystal Project        | Crystal Project is a non-linear JRPG where you are the maker of your own adventure. Explore the world while you find Crystals, unlock classes, learn abilities, and create a strategy capable of taking down the world's toughest bosses. Or just stick to exploring; it's up to you.                                                                                                                                                                                                                           | 919   | 80  |
| 0             | 奇迹之旅                | prince spirit invites you to explore this mysterious land with him                                                                                                                                                                                                                                                                                                                                                                                                                                              | 1     | 0   |
| 3             | World of Voidia（虚亚世界）| World of voidia is a classic style RPG game. We try to create a quite different game and story, By making the game an openworld RPG game. Players will be able to decide everything with the story, the world and NPCs.                                                                                                                                                                                                                                                                                          | 3     | 1   |
| 7             | Myth of Ethary         | Join Maruse in a classic RPG game while searching for her father through Ethary.Watch as she gets companions, fights against evil and finds her own fate ...                                                                                                                                                                                                                                                                                                                                                    | 1     | 0   |
| 6             | The Memory of Eldurim  | Begin a quest for long-lost truth on your vivid journey through a new fantasy world. This open world action RPG requires and rewards your original choices. It starts with your character, includes creativity in combat, and ends with the cultures, cities, and fate of the world.                                                                                                                                                                                                                          | 100   | 142 |
| 4             | Vanilla Bagel: The Roguelike | Vanilla Bagel: The Roguelike is a mostly classic RPG/Roguelike with a vast game world. The game has dozens of dungeons and items, and hundreds of unique enemies. There is a great variety in magic, curses and

</div>

___
##### I'm looking for satirical JRPG games
```python
query = '''I'm looking for satirical JRPG games'''
games = get_games(query, 10)
ranked_order = ranker(games, query)
```

<div style="font-size: 12px; height: 300px; overflow: auto;">

| Original Rank | Name                                | Short Description                                                                                                                                                                                                                         | +    | -  |
|---------------|-------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------|----|
| 0             | Untitled Video Game                 | 'Video game' parody game filled with funny cliches, stereotype characters and nonsense that we're used to seeing in games.                                                                                                                | 2    | 0  |
| 2             | Final Warrior Quest                 | Final Warrior quest is a parody JRPG. Developed entirely in Japan, thus making it a true Japanese Role-Playing Game. Recognizing the inherent foibles of the genre, Final Warrior Quest has tried to mitigate the annoyances while utilizing a humorous tone. | 23   | 9  |
| 4             | NALOGI 2                            | NALOGI 2 - new satirical game in the genre of RPG. The emperor became emperor after the election. Again. For eternity. PAY TAXES!                                                                                                         | 194  | 78 |
| 5             | Video Game Fables                   | Funny, lighthearted RPG with fast, unique, challenging, turn-based combat set in a creative, colorful, abandoned game world that hasn't had a player in decades.                                                                         | 9    | 0  |
| 7             | Epic Battle Fantasy 3               | Epic Battle Fantasy 3 is a silly turn-based JRPG, full of useless NPCs, rabid cats, childish humor, unreasonably large weapons, anime boobs, and other nonsense. And it's totally free!                                                   | 1617 | 57 |
| 1             | An Occasional Dream                 | When a young and upcoming game designer has the bright idea to create a JRPG of his very own, he suddenly finds himself in the JRPG that he set out to create! Though he soon realises that things aren't quite as straight-forward as they seem... | 7    | 0  |
| 3             | CESSPOOL                            | Make the right choices for discover all the mysteries of a psychedelic world in this minimalist JRPG where actions are done through mini-games!                                                                                           | 2    | 0  |
| 9             | Castle of the Underdogs : Episode 1 | CotU is a turn-based comedy JRPG about Hikaru, a mischevous and carefree girl who learns magic. Get a castle, recruit dozens of friends and restore the peace in the Bestann Federation while spreading chaos to most places you step on.     | 13   | 1  |
| 6             | Memory Shards                       | Live the story of Jake, a man stuck in the past as he finds out a way to understand it by playing an old JRPG from his childhood. This is a small introspective drama story.                                                              | 6    | 1  |
| 8             | Satellite                           | When you crave for adventure, but you live in a post-apocalyptic desert. When you dream of love, but you hang out with just your goofy little sister. When you want to be a hero, but everyone thinks of you as of some fragile baby. Then the only thing that can help you to survive is faith in yourself. | 44   | 9  |


</div>

___
##### I'm looking for soothing, mediative games

```python
query = '''I'm looking for soothing, mediative games'''
games = get_games(query, 10)
ranked_order = ranker(games, query)
```

<div style="font-size: 12px; height: 300px; overflow: auto;">

| Original Rank | Name                                      | Short Description                                                                                                                                                                                                                                                     | +   | -  |
|---------------|-------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----|----|
| 0             | Quell Zen                                 | Quell Zen - the very embodiment of relaxing logic games - features over 200 beautifully crafted challenges.                                                                                                                                                            | 50  | 0  |
| 1             | Calmie Dots                               | Calmie Dots is a new take on the classic puzzle game. Relax, don't rush anywhere and just put all the spheres in the right places to pleasant, relaxing music!                                                                                                         | 2   | 0  |
| 5             | Hidden Shapes Animals - VR                | Tired after a hard day at work? Now, with the help of VR, you will delve deep into an environment exclusively prepared for you to have fun and rescue your tranquility, surprising yourself with each solved puzzle!                                                   | 1   | 0  |
| 3             | Hidden Memory - Nature                    | Disconnect from the world and get in touch with nature with this beautiful and relaxing minimalist puzzle!                                                                                                                                                             | 64  | 12 |
| 7             | Hidden Shapes Animals - Jigsaw Puzzle Game| Tired after a hard day at work? Relax and have fun with beautiful and minimalist hand-drawn jigsaw puzzles, created exclusively for you to rescue your tranquility and be amazed by a beautiful art for each puzzle solved!                                              | 35  | 2  |
| 2             | A Quiet Mind                              | Can you get out of this world?                                                                                                                                                                                                                                        | 1   | 1  |
| 6             | DayDream Mosaics                          | Solve over 100 logic based nonograms to earn crystals and rebuild 3 tranquil sanctuaries. Unlock gorgeous wallpapers along the way. Level progress is saved at all times.                                                                                             | 1   | 1  |
| 9             | ZenFarm                                   | Relax and farm in the perfect world inside of ZenFarm game. Zen is for finding inner piece and harmony during your hard days in this beautiful farming game. Find your ZEN during farming!                                                                             | 6   | 4  |
| 4             | Relaxation balls                          | Soothing game. Created to relieve psychological stress in people of different ages. Helminth Valera, Horse Anton Bober Vasily return!!!                                                                                                                               | 52  | 51 |
| 8             | Weightless: An immersive and relaxing experience| Weightless is an immersive and relaxing experience. It is a beautiful game that is designed to clear your mind from any stress, by coloring and listening to music.                                                                                                     | 2   | 6  |


</div>

___

##### I'm looking for a game like Zelda, but with more action and less puzzles.

```python
query = '''I'm looking for a game like Zelda, but with more action and less puzzles.'''
games = get_games(query, 10)
ranked_order = ranker(games, query)
```

<div style="font-size: 12px; height: 300px; overflow: auto;">

| Original Rank | Name                   | Short Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | +   | -   |
|---------------|------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----|-----|
| 2             | Knightin'+             | Join brave sir Lootalot on his epic quest in this little Zelda-lite adventure. Explore and fight your way through the dangerous dungeons filled with traps, puzzles and magical artifacts. And, of course, show the evil bosses who is the real boss here.                                                                                                                                                                                                                                                    | 183 | 28  |
| 5             | Quest of Wizard        | Quest of Wizard is a classic Action Platformer set in a fantasy setting. Go through difficult levels full of dangerous traps and different enemies, fight with bosses, look for chests with gold, open secrets, learn and upgrade spells.                                                                                                                                                                                                                                                                  | 11  | 0   |
| 7             | FriendZoned Archer     | FriendZoned Archer is an action adventure game inspired by the classic NES Zelda. There is complete freedom of exploration, hidden Areas, hidden dungeons and key items to help you ease through the open world.                                                                                                                                                                                                                                                                                           | 5   | 1   |
| 0             | Six F and Six 0        | A 2D action game that explores and adventures in the black and white world The hero is somewhere in this world full of strange creatures Aim to destroy jewels and obtain archives.                                                                                                                                                                                                                                                                                                                      | 22  | 1   |
| 1             | bit Dungeon+           | bit Dungeon+ is a two player action roguelike endless adventure.You and your loved one were captured by demons! You have been trapped in a dungeon for a thousand years asleep… You wake up trapped in cell, grab your weapon and let the quest to find her soul begin!                                                                                                                                                                                                                                    | 83  | 112 |
| 9             | Framed Wings           | Framed Wings is an indie action adventure RPG inspired by a variety of games which focus their attention on combat, exploration, and puzzle solving. Prepare yourself for an action-packed adventure as you take on dungeons, complete quests, solve challenging puzzles, and slay formidable monsters.                                                                                                                                                                                                            | 18  | 3   |
| 4             | Lowpoly Hero           | Play as the hero of the story, Hero. In this generic adventure inspired by classic RPG's, take on the role of Hero and save the princess from The Kingdom's many enemies. Completely open-level based intended for level crawlers and casual players alike.                                                                                                                                                                                                                                             | 1   | 0   |
| 6             | Risky Floors           | In the maze of rooms secret doors can be found behind which there is an even greater danger                                                                                                                                                                                                                                                                                                                                                                                                              | 1   | 4   |
| 8             | Sharp                  | Boot up and navigate a fractured digital world to uncover valuable data hidden amongst dangerous traps and viruses.                                                                                                                                                                                                                                                                                                                                                                                       | 9   | 6   |
| 3             | Deadly Maze: Phase 1   | Arcade intuitive game with mazes and puzzles                                                                                                                                                                                                                                                                                                                                                                                                                                                             | 2   | 4   |

</div>

___