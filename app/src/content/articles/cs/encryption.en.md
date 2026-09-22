---
title: Encryption — keys, data states and what to require
term: cs/encryption
lang: en
---

## The core idea

Encryption turns readable data (plaintext) into unreadable data (ciphertext) using an algorithm and a **key**. Only someone with the right key can turn it back. The algorithms themselves are public and well studied — AES, RSA, elliptic-curve cryptography — and their security rests entirely on keeping the keys secret. That single fact explains most of what goes right and wrong with encryption in practice: strong algorithms are the easy part; managing keys is the hard part.

## Symmetric and asymmetric encryption

|                    | Symmetric                                                       | Asymmetric (public-key)                                                          |
| ------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Keys               | One shared secret key, used both to encrypt and decrypt         | A key pair: a public key anyone may have, and a private key only the owner holds |
| Speed              | Very fast, suited to large amounts of data                      | Much slower, used for small amounts of data                                      |
| Typical algorithms | AES, ChaCha20                                                   | RSA, elliptic-curve algorithms (ECDH, ECDSA)                                     |
| Main difficulty    | Getting the shared key safely to the other party                | Proving that a public key really belongs to who it claims to                     |
| Typical uses       | Disk encryption, database encryption, the bulk of a TLS session | Key exchange, digital signatures, certificates                                   |

In practice the two are combined. Asymmetric cryptography is used to agree on or protect a symmetric key, and the symmetric key then does the heavy lifting. TLS, encrypted email and most file-encryption tools work this way.

Asymmetric cryptography also enables **digital signatures**: the owner signs with the private key, and anyone can verify with the public key. This provides integrity and proof of origin rather than secrecy, and it is what makes certificates and signed software updates possible.

## In transit and at rest

Data needs protection in two states, and they are covered by different controls:

- **In transit** — moving across a network: web traffic, email, API calls, backups sent to a cloud service. Protected by TLS, VPNs and secure protocols such as SSH.
- **At rest** — stored on a disk, in a database, on a USB stick or in a backup. Protected by full-disk encryption (for example BitLocker or FileVault), database or file encryption, and encrypted backups.

A system can do one well and ignore the other. A website with a perfect padlock can still store customer data unencrypted on its server; a fully encrypted laptop still sends data in the clear if its connections are not protected. Requirements should always name both.

A third state, **in use** (data being processed in memory), is harder to protect and generally relies on access control and specialised technology rather than ordinary encryption.

## Hashing is not encryption

Hashing is often confused with encryption, but it is a different tool:

- A hash function turns any input into a fixed-length fingerprint (for example with SHA-256).
- It is **one-way**: there is no key, and the original cannot be recovered from the hash.
- The same input always gives the same hash, and a tiny change gives a completely different one.

That makes hashing useful for **integrity** (has this file changed?) and for **storing passwords**. For passwords, the system stores a hash rather than the password itself and compares hashes at login. Password hashing should use deliberately slow, salted algorithms designed for the purpose — such as Argon2, bcrypt or scrypt — so that a stolen password database is expensive to crack.

The practical governance point: if a supplier says passwords are "encrypted", ask what they mean. Encrypted passwords can be decrypted by anyone who gets the key; properly hashed passwords cannot be recovered at all.

## Key management

Encryption is only as strong as the handling of its keys. Good key management covers the whole life of a key:

- **Generation** — keys are created by proper tools with strong randomness, never chosen by people.
- **Storage** — keys are kept apart from the data they protect, ideally in a key vault, a hardware security module (HSM) or a TPM chip, never in source code or a shared spreadsheet.
- **Access** — as few people and systems as possible can use each key, and use is logged.
- **Rotation** — keys are replaced on a schedule and immediately if compromise is suspected.
- **Backup and recovery** — recovery keys (for example for encrypted laptops) are stored safely, so that a forgotten password does not mean lost data.
- **Retirement** — old keys are revoked and destroyed when no longer needed.

A frequent question in cloud services is **who holds the key**. If the provider manages the keys, they can technically read the data; customer-managed keys shift that control, and that responsibility, to you.

## Why encryption is a NIS2 requirement

NIS2 Article 21(2)(h) lists "policies and procedures regarding the use of cryptography and, where appropriate, encryption" among the minimum cybersecurity risk-management measures. GDPR Article 32 names encryption as an example of an appropriate technical measure, and under GDPR Article 34 notifying affected individuals may not be required if breached personal data was protected in a way that makes it unintelligible, such as by encryption with an uncompromised key.

For a coordinator, meeting this requirement usually means having:

1. A **cryptography policy** stating which data must be encrypted in transit and at rest, and which algorithms and protocol versions are allowed (for example AES-256 or equivalent, TLS 1.2 or higher).
2. **Key-management procedures** covering the lifecycle above, with named owners.
3. **Coverage checks**: are all laptops, mobile devices, backups and databases with sensitive data actually encrypted, and how do we know?
4. **Supplier requirements** that apply the same rules to cloud and hosting providers.
5. A plan for **crypto agility**: an inventory of where cryptography is used, so that algorithms can be replaced when they weaken — a topic that is gaining attention as organisations prepare for post-quantum cryptography.

Encryption rarely prevents an attack from happening. What it does is decide how bad the consequences are when data is lost, stolen or overheard — which is why it belongs in every risk-treatment plan.
