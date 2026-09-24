---
title: Large language models — what they are, how they work and what they mean for governance
term: ai/large-language-model
lang: en
---

## What it is

A **large language model (LLM)** is a deep learning model trained on very large amounts of text to do one thing: predict the next token (a word or part of a word) given the text so far. Repeating that single prediction thousands of times in a row produces paragraphs, summaries, translations, code and answers to questions. Chat assistants, writing aids in office suites and many "AI features" in business software are thin layers on top of an LLM.

The idea of statistical language models is old, but three developments made the current generation possible:

- **The transformer (2017).** The paper "Attention Is All You Need" introduced an architecture that can look at every part of a long text at once instead of reading word by word. It trains efficiently on large numbers of graphics processors, which made much larger models practical.
- **Scale (2018–2020).** Researchers found that making models bigger and feeding them more text kept improving them in fairly predictable ways. GPT-3 (Brown et al., 2020, "Language Models are Few-Shot Learners") had 175 billion weights and could solve new tasks from a handful of examples in the prompt, without any retraining.
- **Instruction tuning and chat (2022).** Extra training on examples of helpful answers, plus feedback from human raters, turned raw text predictors into assistants that follow instructions. ChatGPT's launch in November 2022 brought LLMs to the general public almost overnight.

Today LLMs are offered as cloud services by large providers, as open-weight models that organisations can run themselves, and increasingly as components inside other products.

## How it works

### Training: learning how text usually continues

During **pre-training** the model reads enormous text collections — web pages, books, code, forums — and adjusts billions of internal weights so that its next-token guesses get better. Nothing in this process checks whether a statement is true; the model learns what text _usually looks like_. Afterwards, **fine-tuning** and feedback-based training shape its behaviour: answering politely, refusing clearly harmful requests, following a format.

### Inference: one token at a time

When you send a **prompt**, the model breaks it into tokens, computes a probability for every possible next token, picks one, adds it to the text and repeats. The amount of text it can consider at once is its **context window** — from a few thousand to over a million tokens in current models. Anything outside the window, including earlier conversations, is simply not seen unless a system puts it back in.

### Why it hallucinates

Because the model is optimised to produce _plausible_ text rather than _verified_ text, it sometimes produces fluent, confident statements that are false: invented sources, wrong figures, non-existent court cases. This is called **hallucination**, and it is a direct consequence of how the model is built, not a bug that will be patched away. Techniques such as **retrieval-augmented generation (RAG)** make it rarer and easier to spot, but do not remove it.

### What it does not have

An LLM has no built-in database of facts, no awareness of today's date unless told, and no separation between "instructions" and "data" — everything is text in the same window. That last point is the root of **prompt injection**.

## What it means for an organisation and a coordinator

LLMs arrive in organisations from two directions: officially, through a licensed assistant or a feature in existing software, and unofficially, when staff paste work into a free chat service (**shadow AI**). The governance questions are largely the same:

- **Data.** What happens to the text you send? Is it stored, used for further training, processed outside the EU? For personal data this is a GDPR question, and the provider is typically a **data processor** requiring a **data processing agreement**.
- **Accuracy.** Who checks output before it is used in a decision, a letter to a citizen or a contract?
- **Access.** If the assistant can read mailboxes, files or systems, it inherits every access problem those systems have — and adds prompt injection on top.
- **Regulation.** The **EU AI Act** places duties on providers of general-purpose AI models and, depending on the use case, on the organisations deploying them. It also requires providers and deployers to take measures that support AI literacy, so that staff who work with AI understand its strengths and limits.

### A worked scenario

Freja is a GRC student on an internship at a Danish housing association. Staff have started using a chat assistant built on an LLM to draft emails to tenants and to sum up board meeting notes — exactly the situation described in the term's short definition. Her manager asks her to draft a usage guideline.

She starts with a simple data classification: public information (published rules, general notices) may be used freely; internal information (meeting notes without personal data) only in the company's licensed assistant, where the contract rules out training on customer data; confidential and personal data (tenant complaints, arrears, health information) not at all without a specific assessment. She checks that the provider has a data processing agreement and states where data is processed. She adds two rules for output: a person always reads and owns the final text, and figures or legal statements are checked against the source. Finally she records the assistant as an asset in the risk register, with hallucination and data leakage as named risks, and proposes a short awareness session so staff understand _why_ the rules exist.

## Common misunderstandings

- **"It looks things up."** A plain LLM does not search anything; it generates text from patterns learnt in training. Only systems that add search or RAG consult sources.
- **"If it sounds sure, it is probably right."** Confidence of tone says nothing about correctness. Hallucinations are often the most fluent sentences in an answer.
- **"It learns from our conversation."** The model's weights do not change while you chat. Whether your input is _stored_ and _later used_ for training depends on the provider and the contract — which is exactly why it must be checked.
- **"It is just autocomplete, so it is harmless."** The mechanism is simple, but connected to email, files or tools, an LLM can take actions with real consequences.
- **"The AI Act bans ChatGPT-like tools."** It does not. It regulates uses by risk level and puts transparency and documentation duties on providers; most everyday office use is not high-risk.
