# CFA-SPEC-API-01: Use readable Feature commands

**Applies when:** Designing a Feature API.

**Strength:** Required.

**Guidance:** Expose domain-oriented operations and values instead of deep storage graphs or generic mechanics. Each exposed name and its labels explain the specific action, result and material side effect.

**Why:** A ViewModel author can discover what a Feature does from its API without opening the implementation.

**Example:** Use requestCurrentUser() and clearActivityIndicator() for different operations instead of request(_:) for both.

**Explanation:** [Why use descriptive names in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/readability).

**Related reading:** [Why use cohesive features in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/feature-ownership) · [Why use concrete features in our code?](https://www.3daysofswiftconcurrency.com/cfa/explanation/concrete-features).

**Verify:** Read every exposed Feature declaration and its call sites. For a naming pass, reconcile all Feature functions and properties with an item-by-item keep, rename or blocked decision; check callers do not manipulate repositories or nested implementation state.

**Full rule, context and examples:** [Organize Behaviour into Cohesive Features](../topics/18-organize-behaviour-into-cohesive-features.md). This card is a reading aid; apply the complete canonical section.
