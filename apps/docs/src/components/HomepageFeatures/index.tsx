import type { ReactNode } from "react";
import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";

type FeatureItem = {
	title: string;
	Svg?: React.ComponentType<React.ComponentProps<"svg">>;
	description: ReactNode;
};

const FeatureList: FeatureItem[] = [
	{
		title: "Easy to Use",
		description: <>Bakit makes everything modular with clean and rich feature interfaces.</>,
	},
	{
		title: "Focus on What Matters",
		description: (
			<>Bakit gives you the basic needs for your bot development, let you focus on your features.</>
		),
	},
	{
		title: "Scale up your bot larger",
		description: <>Bakit helps you scale your bot easily, makes things less complicated.</>,
	},
];

function Feature({ title, Svg, description }: FeatureItem) {
	return (
		<div className={clsx("col col--4")}>
			<div className="text--center">
				{Svg ? <Svg className={styles.featureSvg} role="img" /> : undefined}
			</div>
			<div className="text--center padding-horiz--md">
				<Heading as="h3">{title}</Heading>
				<p>{description}</p>
			</div>
		</div>
	);
}

export default function HomepageFeatures(): ReactNode {
	return (
		<section className={styles.features}>
			<div className="container">
				<div className="row">
					{FeatureList.map((props, idx) => (
						<Feature key={idx} {...props} />
					))}
				</div>
			</div>
		</section>
	);
}
