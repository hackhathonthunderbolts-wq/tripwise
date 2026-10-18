import { Check, Layers, Scaling, ShieldCheck, Sparkles } from 'lucide-react'

export default function FUIPricingSectionWithOnePlan() {
  const plan = {
    name: 'Basic plan',
    desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    price: 32,
    isMostPop: true,
    features: [
      'Curabitur faucibus',
      'Curabitur faucibus',
      'Curabitur faucibus',
      'Curabitur faucibus',
      'Curabitur faucibus',
      'Curabitur faucibus',
      'Curabitur faucibus',
      'Curabitur faucibus',
    ],
  }

  const features = [
    {
      name: 'Scalable',
      desc: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text",
      icon: <Scaling className="h-6 w-6" />,
    },
    {
      name: 'Flexible',
      desc: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text",
      icon: <Layers className="h-6 w-6" />,
    },
    {
      name: 'Smooth',
      desc: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text",
      icon: <Sparkles className="h-6 w-6" />,
    },
    {
      name: 'Secure',
      desc: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text",
      icon: <ShieldCheck className="h-6 w-6" />,
    },
  ]

  return (
    <section className="relative flex w-full justify-center bg-blue-950/10 py-14">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_20%_80%_at_50%_-20%,rgba(59,130,246,0.3),rgba(255,255,255,0))]"></div>

      <div className="mx-auto max-w-screen-xl px-4 text-gray-400 md:px-8">
        <div className="relative max-w-xl space-y-3 px-4 md:px-0">
          <h3 className="font-semibold text-blue-600">Pricing</h3>
          <p className="mt-2 font-display text-4xl font-normal tracking-tighter text-black sm:text-5xl">
            The right price for you{' '}
            <br className="hidden sm:inline lg:hidden" />
            whoever you are
          </p>
          <div className="max-w-xl">
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam efficitur consequat
              nunc.
            </p>
          </div>
        </div>
        <div className="mt-16 justify-between gap-8 md:flex">
          <ul className="max-w-md flex-1 space-y-10 px-4 md:px-0">
            {features.map((item, idx) => (
              <li key={idx} className="flex gap-x-3">
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-transparent text-blue-600">
                  {item.icon}
                </div>
                <div>
                  <h4 className="font-display text-lg font-normal tracking-tight text-black">
                    {item.name}
                  </h4>
                  <p className="mt-2 text-gray-600 md:text-sm">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-1 flex-col border-y border-blue-100 bg-white/60 md:mt-0 md:max-w-xl md:rounded-xl md:border md:border-x-none md:shadow-lg">
            <div className="border-b border-blue-100 p-4 py-8 md:p-8">
              <div className="flex justify-between">
                <div className="max-w-xs">
                  <span className="font-display text-2xl font-semibold tracking-tighter text-black sm:text-3xl">
                    {plan.name}
                  </span>
                  <p className="mt-3 sm:text-sm">{plan.desc}</p>
                </div>
                <div className="flex-none font-display text-2xl font-semibold text-black sm:text-3xl">
                  ${plan.price}{' '}
                  <span className="text-xl font-normal text-black">/mo</span>
                </div>
              </div>
              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-br from-blue-400 to-blue-700 px-4 py-2 font-display text-base tracking-tighter text-zinc-50 ring-blue-500/50 ring-offset-2 ring-offset-zinc-950 transition-all hover:scale-[1.02] hover:ring-transparent active:scale-[0.98] active:ring-blue-500/70">
                Get Started
              </button>
            </div>
            <ul className="space-y-3 p-4 sm:grid sm:grid-cols-2 md:block md:p-8 lg:grid">
              <li className="col-span-2 pb-2 font-medium text-black">
                <p>Features</p>
              </li>
              {plan.features.map((featureItem, idx) => (
                <li key={idx} className="flex items-center gap-5 text-gray-600">
                  <Check className="h-5 w-5 text-blue-600" />
                  {featureItem}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
