---
title: Retrieval-augmented generation - letting a language model answer from your own documents
term: ai/retrieval-augmented-generation
lang: en
---

## What it is

**Retrieval-augmented generation (RAG)** is a way of building AI assistants in which a search step first finds passages relevant to a question in a chosen collection of documents, and a **large language model (LLM)** then writes its answer based on those passages. Instead of answering from what the model happened to absorb during training, it answers from material you supply - like a student in an open-book exam.

The term comes from a 2020 paper by Patrick Lewis and colleagues at Facebook AI Research, "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", which combined a search component with a text generator and showed better results on question answering than either alone. The idea took off after 2022, when organisations wanted chat assistants that knew about _their_ policies, products and cases. RAG turned out to be far cheaper and more flexible than retraining a model every time a document changed, and it has become the default design for internal "chat with your documents" tools.

## How it works

### Preparing the documents

Before any question is asked, the document collection is prepared:

1. **Collect** the sources - an intranet, a policy library, a ticket system, a SharePoint site.
2. **Split** each document into chunks of a few hundred words, so that a search can return just the relevant part.
3. **Embed** each chunk: an **embedding** model turns the text into a long list of numbers that captures its meaning, so that texts about similar things end up close to each other.
4. **Store** the embeddings in a vector database or search index, together with a reference back to the original document and - importantly - who is allowed to see it.

### Answering a question

1. The user's question is embedded in the same way.
2. The system retrieves the chunks whose embeddings are closest to the question, often combined with ordinary keyword search.
3. The best chunks are inserted into the **prompt** together with an instruction such as "Answer using only the sources below and cite them."
4. The LLM writes the answer, ideally with links to the sources it used.

### Why it helps - and where it does not

RAG keeps answers **current** (update a document and the next answer reflects it), makes them **checkable** (a user can click through to the source) and reduces **hallucination**, because the model has the right facts in front of it. But it does not remove hallucination: the model can still misread a passage, combine two sources wrongly, or fill gaps when search returns nothing useful. And the answer can only be as good as the documents - an outdated policy retrieved confidently is still outdated.

### RAG versus fine-tuning

The main alternative for adapting a model to an organisation is **fine-tuning**, which gives the model extra training on your own examples. Fine-tuning is good at changing _how_ a model writes - tone, format, terminology - but it bakes knowledge into the model, where it is hard to update, hard to restrict per user and nearly impossible to delete. RAG keeps knowledge _outside_ the model, where normal access control and deletion work. Many real systems use both.

## What it means for an organisation and a coordinator

RAG turns an AI assistant into a new way of reaching your documents. That makes it an access control question as much as an AI question:

- **Permissions must follow the user.** The retrieval step must only return chunks the asking user is allowed to see. If the index was built with a service account that can read everything, the assistant becomes a tool for bypassing access rights.
- **Garbage in, garbage out.** Old drafts, duplicates and outdated policies will be retrieved and quoted. Document hygiene becomes an AI quality issue.
- **Untrusted content.** Documents from outside - customer emails, supplier files, web pages - can carry **prompt injection**. Retrieved text should be treated as data, not instructions.
- **Personal data.** The index is a copy of your documents. It must be covered by retention rules and data subject rights under GDPR; deleting the original is not enough if the chunk remains in the index.

### A worked scenario

Ida is a GRC student at a Danish engineering firm of 400 people. IT has built an internal help bot that answers questions like "how many days of leave do I get?" by finding the current HR policy, quoting it and linking to the source - the example in the term's definition. It works well in the pilot, and IT wants to add the whole HR drive.

Ida asks three questions. First, **who can see what?** The HR drive contains salary reviews and sickness records. She checks and finds the index was built with a service account; a test employee asking "what did my colleague earn last year?" gets a quoted answer. The rollout is paused until the retrieval step filters by the user's own permissions. Second, **which version is true?** The drive holds three versions of the leave policy; she proposes indexing only the published policy library. Third, **how is deletion handled?** She adds the index to the record of processing activities and makes sure that when a document is deleted or its retention period ends, its chunks are removed too. The bot goes live a month later with fewer sources and a clear owner.

## Common misunderstandings

- **"RAG means the AI cannot make things up."** It makes invented answers rarer and easier to catch; it does not eliminate them. Keep source links and train users to click them.
- **"The model learns our documents."** In RAG the model's weights do not change. The documents sit in an index and are looked up each time - which is exactly why they can be updated and restricted.
- **"Security is handled because the documents are internal."** Internal does not mean everyone may see everything. The assistant must respect the same access rules as the file system.
- **"More documents give better answers."** Adding everything often makes answers worse, because outdated or irrelevant passages crowd out the right ones.
- **"RAG and fine-tuning are competitors, pick one."** They solve different problems - knowledge versus behaviour - and are often combined.
