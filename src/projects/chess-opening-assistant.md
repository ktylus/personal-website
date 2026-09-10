---
title: Chess Opening Assistant
description: An agentic RAG system for teaching chess openings with board-state-aware retrieval.
    Put a position on the board and discuss ideas behind it.
order: 1
draft: false
live: "https://chess.kamiltylus.com"
github: "https://github.com/ktylus/chess_opening_assistant"
---

## Building a chess opening assistant

### Why did I choose to build this?

I've been interested in chess for a long time, often playing with friends. An important part of the game is knowing your openings - sequences of initial moves which you know by heart, including opponent's possible responses to your variants of choice.

Studying openings has been increasingly popular among beginners and intermediate players, who see it as a sure way to achieving better results. However, popular ways of study rely on memorising moves, instead of exploring ideas behind them. I think that this makes players' progress slow, as their game understanding is left less developed.

Because of this, I set out to build the Chess Opening Assistant. While LLMs are (understandably) terrible at calculating positions and playing chess in general [1], they likely absorbed great amounts of books and studies on openings during training. Thus, they should be able to provide good advice and carry a discussion on many popular variants, possibly some of those less popular as well.

### Challenge to overcome

It's not enough to just ask an LLM to comment on a chess position, as it will often hallucinate. For example, in one study conducted with a dataset of (position, move) pairs, models were asked to explain the given move in that position. Claude Opus 4.7 made factual errors in 20.8% of its claims [2]. This refers to simple mistakes, like missing that a piece was on a given square. It is not about quality of judgement or calculation which is another issue entirely.

### System overview

My solution is centered around a few measures to ground the model's responses or controlling scope:
- RAG - retrieving studies of the position in question.
- Tool use - the agent has access to chess engine analysis and a database of master-level games.
- Drawing a line between the opening stage and what comes after - we need to avoid venturing too deep into the game tree, or we will risk hallucinations.

I'm evaluating the system with a hand-written set of scenarios using both standard, deterministic checks, and an LLM-as-a-judge scheme with custom metrics.

The app is containerised. It includes the frontend and the backend part, which would normally have to be ran separately, but using Docker Compose allows us to combine the two and build the container with just one command. Bundling the chess engine (Stockfish) in simplifies it even further.

I've deployed the app using the AWS App Runner. In order not to get lost in AWS configuration, I'm tracking it with Terraform. I believe it's important to have it as a source of truth, so that you know at all times what the setup is. Deployment is automatic on each push or merge to the main branch.

The user interface includes a chessboard, so at any given time it's clear what position is being discussed, apart from making it convenient to enter the position.

I will describe most of these elements in more detail in their own sections.

### Grounding the model's responses

#### Retrieval

For setting up RAG, initially I wanted to go with the standard approach of embedding documents into a vector space, then retrieving by similarity. However, I noticed that would probably result in poor retrieval quality. The issue is that chess positions are described with a notation (typically PGN or FEN). In my mind, these condensed strings of letters would be far from enough to create accurate embeddings, putting studies on similar positions close to each other in the space. There is huge leap an embedding would be asked to make -- from notation to understanding -- and that almost surely would not work.

I came up with a simple way of finding relevant documents that works by exact position match. On one side, we have the position entered by the user. On the other side, we know which position the document refers to. Because of this, we can match the two in order to retrieve documents that are describing the position currently on the board.

There are other concrete advantages to this method - it is simple, fast, and doesn't require using an embedding model or a vector database.

Sometimes, we may not be able to find such a document, but a study about a slightly earlier position in the sequence might exist. It's worth to retrieve such a study, because it may still contain general ideas for the position that are still relevant in the variant, or it might include a short analysis of the exact variant we are in. I suspect this slightly increases the risk of hallucination as the model could become confused. I do make it clear in such cases by appending an explanation to the model context, but it's stiill worth eva;uating the effect of this feature.

If I set out to improve the agent's accuracy, the first thing I would think about is gathering more data for the corpus. I think the retrieval component is core to the system as we are trying to avoid relying on the model's chess understanding.

#### Tool use

The agent has access to the Stockfish chess engine for position analysis. The engine outputs 3 variants along with their numeric evaluation. This helps provide concrete strong suggestions, especially if there's a short tactical sequence user needs to be aware of. The time budget allocated to the engine is always the same. One value I experimented with was 2 seconds. This somewhat negatively affects user experience (time to first token), but is necessary for providing good analysis.

Another tool is looking up a database of master-level chess games. For this, I am querying the Lichess API. For a given position, this gives us the most popular moves in the position, and how often they were played. Apart from grounding proposed variants, I think it's useful to give that bigger picture as the user might often be interested in what reply they are likely to face from an opponent.

I am defining the tools and binding them to the agent with LangChain.

### Limiting scope

The study referenced in [Challenge to overcome](#challenge-to-overcome) concerns positions from different stages of the game. Limiting ourselves to openings, then, looks promising, as they are way better represented in the training data. However, we need to define a boundary where the opening stage ends and the middlegame begins. The idea is to refuse answering the user's query if the provided position is not considered an opening. My idea is to classify the position as in-scope, if we are able to retrieve at least 1 document describing it, or if the number of moves played is not higher than a chosen value (for example, 8). This is implemented deterministically with a separate LangGraph node that the process gets directed to. In this case, we give the user a hard-coded refusal answer.

Over the course of a session, the user may change the board position. This might be an issue sometimes, as earlier context referencing an earlier position becomes stale. In order to limit complexity, I allow exploration of only one variant in the app - once you make a move, you can't go back and branch into another variant. The user can only extend the existing position by making new moves on top of what's already there on the board.

### Evaluation

[include failures i discovered]

[including a git commit hash to logs]

### Engineering

I'm using Docker to containerise the application. Having the frontend and backend function independently, I reached for Docker Compose so that it's all bundled together, allowing me to build a container with just one terminal command. I've also included Stockfish installation in creating the container, so the only thing someone cloning the repo would have to do is provide their LLM API key for an appropriate model provider (whose model the system is powered by).

For deployment, I went with AWS App Runner. This way, the cost scales with usage - I don't have to rent a full VM continuously like with EC2. Something like AWS Lambda wouldn't be the right solution either, as the app is a bit heavy with dependencies, especially having to install Stockfish.

I'm managing the AWS configuration with Terraform. I view this kind of solution as a must-have. Both for clear specification of what configuration the project is supposed to have and for reproducibility. One possibly underrated benefit is also that specifying infrastructure as code plays very nicely with LLMs - they can review and modify it easily, while they generally can't browse through your cloud console.

[github ci/cd, oidc interplay with aws, ecr]

[redis caching]

[observability, LangSmith traces, hashing a prompt bundle]

### What I changed (some points possibly redundant but deserve summary)

semantic embeddings -> board state retrieval

langchain -> langgraph

1-5 eval -> binary eval

docker -> docker compose (not to run backend and frontend separately)

### Sources

1. Kolasani et al., “[LLM CHESS: Benchmarking Reasoning and Instruction-Following in LLMs through Chess](https://arxiv.org/abs/2512.01992)”, arXiv, 2025.
2. Ashwin Hebbar et al., “[Hallucinations on the Board: Tool-Augmented Evaluation of LLM Chess Commentary](https://arxiv.org/abs/2608.04240)”, arXiv, 2026.