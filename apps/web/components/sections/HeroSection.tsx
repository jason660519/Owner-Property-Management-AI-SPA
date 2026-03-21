"use client";

import Link from "next/link";
import { Button } from "../ui/Button";
import styles from "./HeroSection.module.css";

const stats = [
  { value: "4", label: "免費入口角色" },
  { value: "6", label: "付費專業角色" },
  { value: "2", label: "目標市場" },
];

export function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.content}>
          <span className={styles.kicker}>
            AI collaboration platform for real estate workflows
          </span>
          <h1 className={styles.title}>
            不只服務房東，
            <br />
            而是服務整個不動產協作鏈
          </h1>
          <p className={styles.description}>
            Owner AI 重新定位為不動產交易與租賃服務協作平台，
            讓自售房東、自租房東、租客、買家、仲介、代書、律師與裝修團隊
            在同一個流程中完成刊登、看屋、簽約、交屋、履約與後續服務。
          </p>

          <div className={styles.cta}>
            <Link href="/pricing">
              <Button variant="primary" size="lg">
                查看角色方案
              </Button>
            </Link>
            <Link href="/services">
              <Button variant="secondary" size="lg">
                查看平台能力
              </Button>
            </Link>
          </div>

          <div className={styles.roleStrip}>
            <span>房東</span>
            <span>租客</span>
            <span>買家</span>
            <span>仲介</span>
            <span>代書</span>
            <span>律師</span>
            <span>裝修</span>
          </div>

          <div className={styles.stats}>
            {stats.map((stat, index) => (
              <div key={index} className={styles.statItem}>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.imageWrapper}>
          <div className={styles.imageContainer}>
            <div className={styles.abstractBg}></div>
            <div className={styles.overlayCardPrimary}>
              <span className={styles.overlayEyebrow}>免費入口</span>
              <strong>房東、租客、買家先免費進入</strong>
              <p>先建立案件與需求，再讓專業角色承接服務。</p>
            </div>

            <div className={styles.overlayCardSecondary}>
              <span className={styles.overlayEyebrow}>付費協作</span>
              <strong>仲介、店長、代書、律師與裝修團隊</strong>
              <p>按案件或按分店收費，聚焦成交效率與流程透明化。</p>
            </div>

            <div className={styles.buildingImage}>
              <img
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1073&q=80"
                alt="Modern Property Building"
                className={styles.heroImg}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "12px",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
