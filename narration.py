"""The voice-over script: one entry per visual beat.

Each entry is (key, spoken, subtitle). `spoken` is what the TTS reads, so
symbols are written out ("x zero"); `subtitle` is what viewers read (None means
use `spoken`). Scenes pull these by key and time their animations to the
generated clip durations.
"""

SCRIPT = [
    # 1. cold open
    ("s01_a", "Here's a cloud of random noise. Thousands of points, scattered with no structure at all.", None),
    ("s01_b", "Now let every point follow a carefully learned velocity field, and watch the noise organize itself into something meaningful.", None),
    ("s01_c", "This is flow matching. And by the end of this video, you'll see just how simple the idea behind it really is.", None),

    # 2. the goal
    ("s02_a", "Every generative model faces the same problem.", None),
    ("s02_b", "On one side, we have noise: a standard Gaussian distribution, which is trivially easy to sample from.", None),
    ("s02_c", "On the other side, we have data. Here it's a spiral, but in real life it could be images, video, or speech, and all we ever get to see are examples.", None),
    ("s02_d", "The goal is to find a way to turn samples of noise into samples of data.", None),
    ("s02_e", "And here's one beautiful way to do it: let every point flow.", None),

    # 3. velocity fields
    ("s03_a", "Imagine a velocity field: an arrow attached to every point in space, which can also change over time.", None),
    ("s03_b", "Drop a point anywhere, and it simply follows the arrows. At every moment, its velocity is whatever the field says at its current position.", None),
    ("s03_c", "Let's follow a few of them.", None),
    ("s03_d", "As time runs from zero to one, every point drifts along its own path. The field keeps changing as it goes, gently steering the whole cloud, until, at the very end, the noise has become a spiral.", None),
    ("s03_e", "So if we had the right field, generating data would be easy. Draw some noise, follow the arrows, and out comes a sample.", None),
    ("s03_f", "The process runs backwards just as well. Let's rewind, and let every point keep its final color.", None),
    ("s03_g", "Now you can see exactly which patch of noise lands where on the spiral. Every noise sample has exactly one destination. The flow is a smooth, invertible map.", None),
    ("s03_h", "The real question is: which velocity field does this? And how could a neural network possibly learn it?", None),

    # 4. straight lines
    ("s04_a", "Flow matching answers this with a surprisingly simple trick.", None),
    ("s04_b", "Take a single noise sample, x zero, and a single data point, x one.",
     "Take a single noise sample, x₀, and a single data point, x₁."),
    ("s04_c", "And connect them with a straight line.", None),
    ("s04_d", "At time t, a point on this line sits at one minus t, times x zero, plus t times x one. At t equals zero it's at the noise, and at t equals one, it has reached the data.",
     "At time t, a point on this line sits at (1 − t) x₀ + t x₁. At t = 0 it's at the noise, and at t = 1, it has reached the data."),
    ("s04_e", "Along the line, its velocity never changes. It's simply x one minus x zero: a quantity we know exactly.",
     "Along the line, its velocity never changes. It's simply x₁ − x₀: a quantity we know exactly."),
    ("s04_f", "Now do this for a whole bunch of random pairs at once.", None),
    ("s04_g", "Each point slides along its own straight line, and together, the cloud flows from noise into the spiral. Collectively, the moving points trace out a path of probability distributions, p t.",
     "Each point slides along its own straight line, and together, the cloud flows from noise into the spiral. Collectively, the moving points trace out a path of probability distributions, pₜ."),
    ("s04_h", "That suggests a way to train. Pick a random pair and a random time, and ask a neural network, v theta, to predict the velocity of the line at that point. It's just a regression problem.",
     "That suggests a way to train. Pick a random pair and a random time, and ask a neural network, v_θ, to predict the velocity of the line at that point. It's just a regression problem."),

    # 5. why it works
    ("s05_a", "But there's a catch. These lines cross each other all over the place.", None),
    ("s05_b", "Zoom in on a single point, at a single moment in time.", None),
    ("s05_c", "Many different lines pass right through it, and each one asks for a different velocity.", None),
    ("s05_d", "So which one should the network predict?", None),
    ("s05_e", "Here's where squared error comes to the rescue. When the targets disagree, the prediction that minimizes the squared error is simply their average.", None),
    ("s05_f", "All those conflicting arrows collapse into one: the average velocity at that point.", None),
    ("s05_g", "Do this at every point, and you get a single, well-defined velocity field, called the marginal velocity field.", None),
    ("s05_h", "And here's the remarkable fact: this averaged field moves the cloud through exactly the same distributions as the straight lines did. It carries noise precisely to data.", None),
    ("s05_i", "In other words, by regressing on simple per-pair targets, the network learns a field we could never write down directly. That's the key result of the flow matching paper: the easy loss has the same gradients as the one we actually care about.", None),

    # 6. one dimension
    ("s06_a", "It helps to see all of this in one dimension.", None),
    ("s06_b", "Here, time runs from left to right, and brightness shows the density, which morphs from a single Gaussian into three separate bumps.", None),
    ("s06_c", "The training targets are straight lines from noise to data, and they cross each other constantly.", None),
    ("s06_d", "The learned flow, on the other hand, follows smooth, curved paths that never cross.", None),
    ("s06_e", "In fact, they can't. A velocity field gives each point exactly one direction to go, so two trajectories can never meet.", None),
    ("s06_f", "And yet, at every moment in time, both pictures describe exactly the same distribution. Different paths, same destination.", None),

    # 7. training
    ("s07_a", "So what does training actually look like? Here's the entire loop.", None),
    ("s07_b", "Sample some data, x one. Sample some noise, x zero. Pick random times, and mix the two to get points on the lines.",
     "Sample some data, x₁. Sample some noise, x₀. Pick random times, and mix the two to get points on the lines."),
    ("s07_c", "Then ask the network to predict x one minus x zero, and take a gradient step. That's it.",
     "Then ask the network to predict x₁ − x₀, and take a gradient step. That's it."),
    ("s07_d", "Here's what the network generates as training goes on. It starts out producing noise. After a few thousand steps, the spiral begins to emerge, and by the end, it's crisp.", None),
    ("s07_e", "No differential equations to solve during training, no likelihoods, and no adversarial games. Just regression.", None),

    # 8. sampling
    ("s08_a", "To generate something new, we start from fresh noise, and take small steps along the network's arrows.", None),
    ("s08_b", "Each step moves every point by delta t, times the velocity the network predicts.",
     "Each step moves every point by Δt, times the velocity the network predicts."),
    ("s08_c", "After a few hundred of these tiny steps, the noise has turned into brand new samples from the data distribution.", None),
    ("s08_d", "But how many steps do we really need?", None),
    ("s08_e1", "With a single giant step, every sample lands on the average of the data: one lonely point.", None),
    ("s08_e2", "Two steps give a blur.", None),
    ("s08_e3", "With four, the spiral appears.", None),
    ("s08_e4", "And by eight or thirty-two, it looks just right.", None),
    ("s08_f", "The paths are curved, so large straight steps cut corners. Making the flow straighter, so that fewer steps suffice, is exactly what follow-up ideas like rectified flow are about.", None),

    # 9. recap
    ("s09_a", "So that's flow matching, in three lines.", None),
    ("s09_b", "Interpolate along straight lines between noise and data.", None),
    ("s09_c", "Regress a network onto the velocity of those lines.", None),
    ("s09_d", "And integrate the learned field to generate new samples.", None),
    ("s09_e", "Scaled up, this same simple recipe powers many of today's best generators for images, video, and audio.", None),
    ("s09_f", "Thanks for watching.", None),
]

LINES = {key: spoken for key, spoken, _ in SCRIPT}
SUBTITLES = {key: (sub or spoken) for key, spoken, sub in SCRIPT}
