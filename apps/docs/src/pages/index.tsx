import type { ReactNode } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import HomepageFeatures from "@site/src/components/HomepageFeatures";

import styles from "./index.module.css";

function HomepageHeader() {
	const { siteConfig } = useDocusaurusContext();
	return (
		<header className={clsx(styles.heroBanner)}>
			<div
				className="container"
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "40px",
					paddingTop: "5rem",
				}}
			>
				<p className={styles.heroSubtitle}>{siteConfig.tagline}</p>

				<div
					className={styles.buttons}
					style={{
						display: "flex",
						justifyContent: "center",
						gap: "20px",
					}}
				>
					<Link className={clsx("button button--lg", styles.buttonPrimary)} to="/docs/introduction">
						Getting Started
					</Link>

					<Link
						className={clsx("button button--lg", styles.buttonSecondary)}
						to="https://discord.gg/pGnKbMfXke"
					>
						Discord
					</Link>
				</div>
			</div>
		</header>
	);
}

export default function Home(): ReactNode {
	const { siteConfig } = useDocusaurusContext();
	return (
		<Layout title={siteConfig.title} description="A discord.js framework">
			<HomepageHeader />
			<main>
				<HomepageFeatures />
			</main>
		</Layout>
	);
}
