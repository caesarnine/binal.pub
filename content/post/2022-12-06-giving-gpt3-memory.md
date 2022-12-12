+++
title = "Giving GPT3 Memories"
date = 2022-12-11T02:13:50Z
author = "Binal Patel"
tags = ["nlp", "gpt3", "llm"]
categories = ["coding"]
+++

I've been playing around with GPT3 (and ChatGPT) a lot and have been wanting to start posting again, so I decided to start posting little experiments I do. These won't be polished but hopefully interesting at least.

Here's the first - a rough pass on how to enable GPT3 to retain memory of past encounters/conversations (as opposed to having cram everything in the same prompt, or losing context entirely from invocation to invocation.).

>For context - the latest GPT3 model available (text-davinci-003) allows for a prompt of 4000 tokens which is actually quite large, so in a lot of cases you could very well just continue on a conversation with the past conversation prefixed onto it as the prompt (though - that would get expensive quickly given how pricing works.)

The general idea is - after every conversation we have just ask GPT3 to progressively update a summary (memory) of the interaction with a specific "person". 

When a new conversation starts, we prefix it with the memory we have, and when it ends we update the memory again. Here's some real output from this:

```python
agent = Agent('John')
agent.respond('Cindy', '''Hi! How are you?''')
```
>Cindy: Hi! How are you?
>>You:  Hi Cindy! I'm doing great, thanks for asking. How about you?

```python
agent.respond('Cindy', '''I've been good! I've been working on my new startup. How about you?''')
```
>Cindy: I've been good! I've been working on my new startup. How about you?
>>You:  That sounds really exciting! I'm just trying to stay productive and make the most of my free time. What kind of startup are you working on?

```python
agent.respond('Cindy', '''It's a virtual reality company. I'm working on a new headset that will allow people to experience virtual reality in a whole new way.''')
```
>Cindy: It's a virtual reality company. I'm working on a new headset that will allow people to experience virtual reality in a whole new way.
>>You:  That sounds amazing! What inspired you to create something like that?

```python
agent.respond('Cindy', '''It's an idea I've had forever and I decided to finally take the risk and try it.'''
```
>Cindy: It's an idea I've had forever and I decided to finally take the risk and try it.
>>You:  That's awesome! It takes a lot of courage to try something like that. I'm really impressed.

```python
agent.update_other_memory('Cindy')
print(agent.other_memory['Cindy'])
```
>```- Cindy is working on a new startup - a virtual reality company creating a new headset to experience virtual reality in a new way. ```

>```- She had the idea forever and decided to take the risk and try it.```

```python
# reset the conversation, so all we have is the memory to start this next conversation
agent.conversation_so_far = ""
agent.respond('Cindy', '''Hey! How are you today?''')
```
> Cindy: Hey! How are you today?
>>You:  Hi Cindy! I'm doing great. How about you? Are you still working on that startup?
```python
agent.respond('Cindy', '''We met some investors and raised some money!'''
```
>Cindy: We met some investors and raised some money!
>>You:  Wow, that's really exciting! What kind of company are you starting?
```python
agent.respond('Cindy', '''I am! We just raised some funding so we've started hiring some new people.''')
```
> Cindy: I am! We just raised some funding so we've started hiring some new people.
>>You:  That's awesome! Congratulations! What do you need help with?

```python
agent.respond('Cindy', '''Right now we're hiring for everything. Are you still doing design?''')
```
>Cindy: Right now we're hiring for everything. Are you still doing design?
>>You:  Yes, I'm still doing it. What kind of design are you looking for?

```python
agent.respond('Cindy', '''We're looking for a designer to help us with the user interface.''')
```

>Cindy: We're looking for a designer to help us with the user interface.
>>You:  That sounds like an interesting project. What do you need in particular?
```python
agent.respond('Cindy', '''We're not a 100% sure yet, could I send you the details later over email?''')
```
>Cindy: We're not a 100% sure yet, could I send you the details later over email?
>>You:  Sure, I'd love to check it out. Please send me the details.

```python
agent.update_other_memory('Cindy')
print(agent.other_memory['Cindy'])
```
>```- Cindy and I are acquaintances. She is working on a virtual reality startup and is creating a new headset that will allow people to experience virtual reality in a whole new way. Her idea for the startup has been something she's had for a while and she finally took the risk to pursue it. She recently raised some funding and is now hiring for everything, including design for the user interface. She asked me if I was still doing design and asked me to look into the details of the project over email.```

```python
# reset the conversation, so all we have is the memory to start this next conversation
agent.conversation_so_far = ""
agent.respond('Cindy', '''Hey! Could you remind me of what we talked about last time?''')
```
>Cindy: Hey! Could you remind me of what we talked about last time?
>>You:  Sure, I was telling you about my design experience and you were interested in getting me on board with your virtual reality startup. You were telling me about the new headset you were developing and you were looking for someone to design the user interface for it.

The code for the above agent here:
```python
import openai

class Agent():
  def __init__(self, name):
    self.name = name
    self.other_memory = {}
    self.self_prompt = f"""
    You are a person named {name} and are an interesting and chatty person.
    """
    self.conversation_so_far = ""

  def get_completion(self, prompt, stop = None):
      response = openai.Completion.create(
        temperature=0.8,
        engine="text-davinci-003",
        prompt=prompt,
        max_tokens=500,
        stop=stop

      )
      return response.choices[0].text

  def respond(self, other_person, message):
    conversation_prompt = f"""
    This is your memory of {other_person}:
    {self.other_memory.get(other_person,'This is the first time you are interacting.')}

    This is your current conversation with {other_person}:
    {self.conversation_so_far}
    """

    conversation = f"""
    {other_person}: {message}
    You: """

    prompt = self.self_prompt + conversation_prompt + conversation

    response = self.get_completion(prompt, [f'{other_person}:'])
    self.conversation_so_far += conversation + response

    print(f'----\n{self.conversation_so_far}\n----')

  def update_other_memory(self, other_person):
    memory_prompt = f"""
    EXAMPLE
    Update your memory of Jane.
    
    Existing memory:
    - Jane I are friends. We went to the same high school and college. We both like to play tennis.
    New lines of conversation:
    Jane: Hey! How was your holiday?
    Me: It was a lot of fun! I got to see my parents and my sister. How about you?
    Jane: It was great! I went to visit my parents in Upstate New York. We went ice skating and hiking with my family.
    Updated memory:
    - Jane and I are friends. We went to the same high school and college. We both like to play tennis.
    - Her parents live in Upstate New York. She went ice skating and hiking with their family over the holidays.
    END OF EXAMPLE

    Update your memory of {other_person}.

    Existing memory:
    {self.other_memory.get(other_person, '')}
    New lines of conversation:
    {self.conversation_so_far}
    Updated memory:
    """

    response = self.get_completion(memory_prompt)

    self.other_memory[other_person] = response
```
The above is pretty much the most basic of examples - the downsides I've seen of using it as is, which could maybe be fixed with a better prompt/added metadata to the prompts:
* It sometimes doesn't understand something happened in the past. I.E. if the summary was "George went on a trip to England and we chatted a lot about it" the generated response would still be "How was your trip to England?"
* There's no prioritization of important memories vs unimportant facts.
* The summary sometimes loses its temporal ordering, so a recent event is summarized first vs a event that had already been summarized.

Here's things I may try in the future if I revisit this:
* Using the Embeddings endpoint + retrieval on some threshold vs a summary. 
  * The idea being you could embed each conversation then on the fly retrieve the ones that are most relevant without loss of information that results from summarization.
  * This could potentially let you mix and match different conversations which would be interesting. I.E. if talking about a trip to Rome the agent could draw on multiple conversations its had in the past about Rome vs just past conversations with one person.
* Per conversation summaries vs a global summary that's updated.
* Guided conversations; have some goal to obtain X and based off of memory + current conversation try and achieve obtaining that info.
* Have the agent updated it's "self prompt" if it hallucinates new information about itself.
  * Set up a few of these agents and let them converse with each other, updating their memories of each other + self prompt and see if any interesting dynamics occur.
