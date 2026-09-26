# DOGFOOD Judging & Scoring Specification

## 1. Overview

DOGFOOD provides a fair, workload-balanced, and mathematically normalized evaluation system for hackathon submissions. This document outlines the judging methodology that will be implemented in subsequent phases.

---

## 2. Key Pillars

### Workload-Balanced Assignment Algorithm (Phase 6)
- **Workload Balance**: Distributes $K$ judges per project while minimizing variance across judges.
- **Conflict of Interest (COI) Prevention**: Precludes judges from evaluating projects created by themselves, their teammates, or organizations with which they have recorded affiliations.
- **Reproducibility**: Deterministic seed allocation enables auditable replay of assignment rounds.

### Weighted Rubrics (Phase 7)
Organizers configure custom criteria with percentage weight allocations summing to 100%:
$$\text{Raw Score} = \sum_{i=1}^{N} \left(\text{Criterion Score}_i \times \frac{\text{Criterion Weight}_i}{100}\right)$$

### Cross-Judge Score Normalization (Phase 8)
To address the variance between lenient and harsh evaluators, DOGFOOD applies **Z-Score standardization with Min-Max scaling**:
$$Z_{j,s} = \frac{S_{j,s} - \mu_j}{\sigma_j + \epsilon}$$
For judges with small sample sizes ($N < 3$), a Bayesian prior baseline is applied to avoid mathematical distortions.

---

## 3. Implementation Status

- **Phase 1**: Architecture and data contract models defined in `@dogfood/shared`.
- **Phase 6–8**: Full assignment algorithm, scoring console, and normalization engine implementation.
