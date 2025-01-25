## WK1 Jan 20, 2025  - Jan 24, 2025 
# Probability
## Review of Set Concepts

We began by reviewing concepts I had already encountered in Discrete Mathematics, focusing on:

- **Sets and Subsets**: Definitions and examples of sets, subsets, and how to verify whether one set is contained in another.
- **Basic Set Operations**: 
  - **Union** \((A \cup B)\)
  - **Intersection** \((A \cap B)\)
  - **Complement** \((A^c)\)

One key observation from class is that seemingly “big” or intimidating names often describe straightforward ideas. For instance, **De Morgan’s Laws** are intuitive statements about complements of unions and intersections:

\[
(A \cup B)^c = A^c \cap B^c
\]
\[
(A \cap B)^c = A^c \cup B^c
\]

Although these laws may look formal, they reflect simple set relationships.

## Disjoint (Mutually Exclusive) Events

- Two sets \(A\) and \(B\) are **disjoint** (or **mutually exclusive**) if:
  \[
  A \cap B = \varnothing.
  \]

## Brief Look at Permutations and Combinations

We also looked at examples that involve basic counting principles, laying the groundwork for **permutations** and **combinations**. These are powerful tools for counting the number of ways to arrange or choose items from a collection, which we will explore in more depth in future sessions.

# Partial Differential Equations
Again for this we mostly did review of concepts from previous classes that would prove key in our future sessions. I'll do a writeup for Multivariable Calculus and ODEs next week.

## Linear Algebra: Inner Products

In linear algebra, an **inner product** on a (real) vector space \(V\) is a function 
\[
\langle \,\cdot\,, \,\cdot\, \rangle: V \times V \to \mathbb{R}
\]
that generalizes the geometric notion of the **dot product**. It must satisfy the following properties for all \(f, g, h \in V\) and all real scalars \(c\):

1. **Non-negativity**:  
   \[
   \langle f, f \rangle \ge 0.
   \]
2. **Definiteness**:  
   \[
   \langle f, f \rangle = 0 \quad \Longleftrightarrow \quad f = 0.
   \]
3. **Additivity in the first argument**:  
   \[
   \langle f + g, h \rangle = \langle f, h \rangle + \langle g, h \rangle.
   \]
4. **Homogeneity in the first argument**:  
   \[
   \langle c\,f, h \rangle = c \,\langle f, h \rangle.
   \]
5. **Symmetry** (for real vector spaces):  
   \[
   \langle f, g \rangle = \langle g, f \rangle.
   \]

### The Dot Product (Classical Example)

When \(V = \mathbb{R}^n\), the inner product is given by the **dot product**. For two vectors 
\(\mathbf{u} = (u_1, u_2, \dots, u_n)\) and \(\mathbf{v} = (v_1, v_2, \dots, v_n)\),
the dot product is:

\[
\mathbf{u} \cdot \mathbf{v} 
= \sum_{i=1}^{n} u_i \, v_i.
\]

This definition satisfies the five properties above, making it a valid inner product on \(\mathbb{R}^n\).

### Inner Products on Function Spaces

For function spaces, one common way to define an inner product is via an integral. For example, if \(f\) and \(g\) are real-valued functions on an interval \([a, b]\), one often sets:

\[
\langle f, g \rangle = \int_a^b f(x)\,g(x)\,dx.
\]

This, too, can be shown to satisfy the five properties, providing a powerful way to measure “angles” and “lengths” of functions in various spaces.

# Nonlinear Dynamics and Chaos
## Philosophical Session: Determinism and the Road to Chaos Theory

### Determinism and Early Views

**Determinism** is the philosophical concept that every event or state of affairs is the inevitable result of preceding events and the laws of nature. Historically, many thinkers believed that the universe operates like a clockwork machine, following precise and predictable laws.

- **Gottfried Wilhelm Leibniz (1646–1716)**: Emphasized that “everything happens for a reason,” reflecting a deeply deterministic viewpoint where God or a higher principle governs all events in the universe.
- **Baruch Spinoza (1632–1677)**: Proposed that the universe operates under a strict necessity dictated by God/Nature, implying that free will may be an illusion.

### Laplace’s Demon
A famous articulation of determinism came from **Pierre-Simon Laplace** (1749–1827). He suggested a hypothetical “demon” that, given perfect knowledge of all particles’ positions and velocities at a given moment, could predict the entire future (and retrodict the entire past) of the universe. This notion underlies **classical determinism**: if we know all initial conditions precisely, the future is entirely predictable.

---

## Classical vs. Quantum Physics

By the late 19th and early 20th centuries, **classical physics** seemed to confirm determinism for large-scale objects. Physical laws like **Newton’s laws** worked exceedingly well to predict the motions of planets and projectiles.

However, at the atomic and subatomic scales, **quantum mechanics (QM)** introduced inherent probabilities:
- **Quantum Indeterminacy**: Events at the quantum level appear governed by probability rather than certainty.
- **Einstein’s Discomfort**: This randomness led Einstein to famously remark, “God doesn’t play dice,” expressing skepticism that fundamental physics could be inherently probabilistic.

---

## The Birth of Chaos Theory

While quantum mechanics challenged determinism at small scales, **chaos theory** showed that even classical deterministic systems can exhibit unpredictable behavior if they are sensitive to initial conditions.

- **Edward Lorenz (1960s–1970s)**: Working as a meteorologist at MIT, Lorenz discovered that tiny rounding differences in his weather simulation grew into drastically different outcomes over time. This phenomenon was later called the **butterfly effect**, popularizing the idea that small changes in initial conditions can lead to large variations later.

### Key Idea: Sensitive Dependence on Initial Conditions
Chaos theory does not negate determinism in a strict sense—these systems still follow deterministic laws—but it highlights our **practical inability** to predict outcomes unless we know the initial conditions with extreme (often unachievable) precision.

---

## Pendulum Demonstrations

1. **Single Pendulum**  
   - A single pendulum has two degrees of freedom (angle \(\theta\) and angular velocity \(\dot{\theta}\)).
   - Its motion, while it may appear intricate, is mathematically **predictable** and not chaotic.

2. **Double Pendulum**  
   - When a second pendulum is attached, we now have four degrees of freedom.
   - For sufficiently large degrees of freedom (\(\geq 3\)), systems can exhibit **chaotic** behavior.  
   - A double pendulum’s motion can become **irrational-looking**, sensitive to even minuscule changes in initial conditions, showcasing the essence of chaos.

> **Note:** It is often stated that **chaos is impossible if the degrees of freedom are fewer than three**. The double pendulum, having four, makes a wonderful physical example of chaotic motion.

---

## Concluding Thoughts

This session reminded us that:
- Determinism as a concept has evolved, from the **clockwork universe** view to a modern understanding that includes both **quantum indeterminacy** and **chaotic systems** in the classical realm.
- While the universe may (or may not) be fundamentally deterministic, **chaos theory** shows that exact prediction can be practically impossible due to **sensitive dependence on initial conditions**.
- The philosophical debates around **free will**, **probability**, and **scientific predictability** continue, enriched by insights from quantum theory and chaos.

By and large, what we covered in the Nonlinear Dynamics and Chaos class was most interesting. I'll from today refer to it as Chaos Theory for short. I'll also add DSP to next weeks post.