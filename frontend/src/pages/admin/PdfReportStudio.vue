<template>
  <AdminSidebarLayoutComponent :role-label="'ADMINISTRATOR'" :navigation-items="adminNavigationItems">
    <main class="pdf-studio">
      <aside class="pdf-studio__editor">
        <header class="pdf-studio__brand">
          <div class="pdf-studio__brand-kicker"><span></span> Editorial Report Studio</div>
          <div class="pdf-studio__brand-row">
            <h1>PDF Analytics Builder</h1>
            <span class="pdf-studio__page-badge">A4 · 2 pages</span>
          </div>
        </header>

        <div class="pdf-studio__actions">
          <button class="pdf-studio__export" type="button" :disabled="isExporting" @click="exportPdf">
            <span aria-hidden="true">⇩</span>{{ isExporting ? 'Preparing PDF…' : 'Export / Save as PDF' }}
          </button>
          <button class="pdf-studio__reset" type="button" @click="resetReport">Reset</button>
        </div>

        <section v-if="reportType === 'analytics'" class="pdf-studio__telemetry">
          <div class="pdf-studio__section-heading"><span>Dataset telemetry mode</span><span class="pdf-studio__tag">{{ telemetryMode === 'live' ? 'Dashboard baseline' : 'Clearly labeled simulation' }}</span></div>
          <div class="pdf-studio__toggle">
            <button type="button" :class="{ active: telemetryMode === 'live' }" @click="telemetryMode = 'live'">Baseline (live)</button>
            <button type="button" :class="{ active: telemetryMode === 'simulated' }" @click="telemetryMode = 'simulated'">Simulated activity</button>
          </div>
          <p v-if="telemetryMode === 'simulated'">Preview values are illustrative and will be labeled as simulated in the PDF.</p>
        </section>

        <div class="pdf-studio__form">
          <section class="pdf-studio__form-section pdf-studio__form-section--dataset">
            <h2><span>↗</span> Report dataset</h2>
            <label>Choose report type
              <select v-model="reportType" @change="handleReportTypeChange">
                <option value="analytics">Analytics overview</option>
                <option value="reservations">Reservations</option>
                <option value="inventory">Inventory</option>
                <option value="accounts">Accounts</option>
              </select>
            </label>
            <small>{{ datasetHelpText }}</small>
          </section>

          <section class="pdf-studio__form-section">
            <h2><span>1</span> Report header &amp; overview</h2>
            <label>Organization / Unit Name<input v-model="report.organization" /></label>
            <label>Report Main Title<input v-model="report.title" /></label>
            <div class="pdf-studio__field-grid">
              <label>Reporting Period<input v-model="report.period" /></label>
              <label>Generated Timestamp<input v-model="report.generatedAt" /></label>
            </div>
            <label>Executive Brief (Page 1 Narrative)<textarea v-model="report.executiveBrief" rows="4"></textarea></label>
          </section>

          <section class="pdf-studio__form-section pdf-studio__form-section--amber">
            <h2><span>2</span> Sign-off &amp; governance block</h2>
            <div class="pdf-studio__field-grid">
              <label>Prepared By (Name)<input v-model="report.preparedName" /></label>
              <label>Prepared By (Role/Title)<input v-model="report.preparedRole" /></label>
              <label>Approved By (Name)<input v-model="report.approvedName" /></label>
              <label>Approved By (Role/Title)<input v-model="report.approvedRole" /></label>
            </div>
            <label>Sign-Off Date<input v-model="report.signOffDate" /></label>
          </section>

          <section class="pdf-studio__form-section">
            <div class="pdf-studio__interpretation-heading">
              <h2><span>3</span> Graph descriptions &amp; interpretations</h2>
              <button type="button" @click="generateGraphInterpretations">Regenerate</button>
            </div>
            <p class="pdf-studio__auto-note">Interpretations are generated from the current analytics data and remain editable.</p>
            <label v-for="(figure, index) in report.figures" :key="figure.label">{{ figure.label }}<textarea v-model="figure.explanation" rows="4"></textarea></label>
          </section>

          <p v-if="loadError" class="pdf-studio__error">{{ loadError }}</p>
          <button class="pdf-studio__refresh" type="button" :disabled="isLoading" @click="loadReportData">{{ isLoading ? `Refreshing ${reportTypeLabel.toLowerCase()} data…` : `Refresh ${reportTypeLabel.toLowerCase()} data` }}</button>
        </div>
      </aside>

      <section class="pdf-studio__preview-area">
        <div class="pdf-studio__preview-note">
          <strong>PRINT PREVIEW</strong>
          <span>Formatted as a <b>2-page Executive A4 Factsheet</b> with dedicated graph interpretations.</span>
          <small>Tip: Enable “Background graphics” in the print dialog.</small>
        </div>

        <div ref="documentRef" class="pdf-studio__document">
          <article class="pdf-page pdf-page--one">
            <header class="pdf-page__header">
              <div class="pdf-page__unit"><img class="pdf-page__mark" src="@/assets/TechReserve_LogoB.png" alt="TechReserve logo" /><span>{{ report.organization }}</span></div>
              <span class="pdf-page__period">Period: {{ report.period }}</span>
              <h2>{{ report.title }}</h2>
              <p>Engine: TechReserve {{ reportTypeLabel }} Report <i></i> Generated: {{ report.generatedAt }}</p>
              <span v-if="telemetryMode === 'simulated'" class="pdf-page__simulation">SIMULATED ACTIVITY</span>
            </header>

            <div class="pdf-page__body">
              <section class="pdf-page__brief"><h3>Executive overview &amp; analytical scope</h3><p>{{ report.executiveBrief }}</p></section>
              <template v-if="reportType === 'analytics'">
              <section class="pdf-page__model-grid">
                <article v-for="model in models" :key="model.number" :class="`tone-${model.tone}`"><div><span>{{ model.number }}. {{ model.label }}</span><b>{{ model.algorithm }}</b></div><h3>{{ model.title }}</h3><p>{{ model.summary }}</p></article>
              </section>

              <section class="pdf-page__panel">
                <header class="pdf-page__panel-heading"><div><span class="pdf-page__figure">FIGURE 01</span><h3>Demand forecasting</h3><p>Forecasted reservation demand across the selected reporting window.</p></div><b>{{ metrics.forecastModel }}</b></header>
                <div class="pdf-page__forecast-row">
                  <div class="pdf-chart">
                    <svg viewBox="0 0 600 205" role="img" aria-label="Reservation demand trend chart">
                      <g class="pdf-chart__grid"><line v-for="y in [25, 62, 99, 136, 173]" :key="y" x1="42" :y1="y" x2="590" :y2="y" /></g>
                      <g class="pdf-chart__labels"><text v-for="(label, index) in chartLabels" :key="label" :x="42 + index * 91" y="197">{{ label }}</text></g>
                      <polyline class="pdf-chart__line" :points="forecastPoints" />
                      <circle v-for="(point, index) in forecastDots" :key="index" :cx="point.x" :cy="point.y" r="4" />
                    </svg>
                  </div>
                  <aside class="pdf-page__insights"><h4>Forecast insights</h4><dl><div><dt>Forecasted peak</dt><dd>{{ metrics.peakDate }}<strong>{{ metrics.peakValue }} requests</strong></dd></div><div><dt>Expected growth</dt><dd><strong>{{ metrics.growth }}</strong>from previous period</dd></div><div><dt>Validation</dt><dd><strong>{{ metrics.forecastStatus }}</strong></dd></div></dl></aside>
                </div>
                <p class="pdf-page__interpretation"><b>GRAPH EXPLANATION &amp; ANALYTICAL INTERPRETATION</b>{{ report.figures[0].explanation }}</p>
              </section>

              <section class="pdf-page__panel">
                <header class="pdf-page__panel-heading"><div><span class="pdf-page__figure">FIGURE 02</span><h3>Readiness risk detection</h3><p>Risk level distribution across tracked equipment inventory.</p></div><b>{{ metrics.riskStatus }}</b></header>
                <div class="pdf-page__risk-row"><div class="pdf-page__risk-score"><strong>{{ metrics.riskScore }}%</strong><span>Risk index</span></div><ul><li v-for="band in riskBands" :key="band.label"><i :class="`risk-${band.tone}`"></i><span>{{ band.label }}</span><b>{{ band.count }} equip.</b></li></ul><aside><h4>Top risk factors monitored</h4><p v-for="factor in riskFactors" :key="factor">› {{ factor }}</p></aside></div>
                <p class="pdf-page__interpretation pdf-page__interpretation--green"><b>GRAPH EXPLANATION &amp; ANALYTICAL INTERPRETATION</b>{{ report.figures[1].explanation }}</p>
              </section>
              </template>
              <template v-else>
                <section class="pdf-page__model-grid pdf-page__model-grid--summary">
                  <article v-for="item in reportSummaryCards" :key="item.label" class="tone-green"><div><span>{{ item.label }}</span><b>{{ reportTypeLabel }}</b></div><h3>{{ item.value }}</h3><p>{{ item.note }}</p></article>
                </section>
                <section class="pdf-page__panel">
                  <header class="pdf-page__panel-heading"><div><span class="pdf-page__figure">FIGURE 01</span><h3>{{ datasetOverviewTitle }}</h3><p>{{ datasetOverviewSubtitle }}</p></div><b>{{ reportRows.length }} records</b></header>
                  <div class="pdf-page__distribution">
                    <div v-for="item in reportDistribution" :key="item.label"><span>{{ item.label }}</span><i><em :style="{ width: `${item.percent}%`, background: item.color }"></em></i><b>{{ item.count }}</b></div>
                  </div>
                  <p class="pdf-page__interpretation"><b>DATA SUMMARY &amp; INTERPRETATION</b>{{ report.figures[0].explanation }}</p>
                </section>
                <section class="pdf-page__panel">
                  <header class="pdf-page__panel-heading"><div><span class="pdf-page__figure">TABLE 01</span><h3>{{ datasetTableTitle }}</h3><p>{{ datasetTableSubtitle }}</p></div><b>{{ reportRows.length }} total</b></header>
                  <div class="pdf-page__data-table-wrap"><table class="pdf-page__data-table"><thead><tr><th v-for="column in reportColumns" :key="column.key">{{ column.label }}</th></tr></thead><tbody><tr v-for="(row, index) in previewRows" :key="row.id || index"><td v-for="column in reportColumns" :key="column.key">{{ row[column.key] ?? '—' }}</td></tr><tr v-if="!previewRows.length"><td :colspan="reportColumns.length">No {{ reportTypeLabel.toLowerCase() }} records are available for this report.</td></tr></tbody></table></div>
                  <p class="pdf-page__table-note">Showing {{ previewRows.length }} of {{ reportRows.length }} records. Additional records continue on following pages.</p>
                  <p class="pdf-page__interpretation pdf-page__interpretation--green"><b>KEY FINDING</b>{{ report.figures[1].explanation }}</p>
                </section>
              </template>
            </div>
            <footer class="pdf-page__footer"><span>Confidential {{ reportTypeLabel.toLowerCase() }} report · TechReserve</span><b>Page 1 of {{ totalReportPages }}</b></footer>
          </article>

          <article class="pdf-page pdf-page--two">
            <header class="pdf-page__running-header"><strong>{{ reportType === 'analytics' ? 'Operational optimization, utilization & governance' : `${reportTypeLabel} register & governance` }}</strong><span>{{ report.period }}</span></header>
            <div class="pdf-page__body pdf-page__body--second">
              <template v-if="reportType === 'analytics'">
              <section class="pdf-page__panel">
                <header class="pdf-page__panel-heading"><div><span class="pdf-page__figure">FIGURE 03</span><h3>Resource allocation optimization</h3><p>Efficiency indicators derived from requests, scheduling and inventory usage.</p></div><b>Solver: R-ILP linear</b></header>
                <div class="pdf-page__optimization-grid"><article v-for="metric in optimizationMetrics" :key="metric.label"><div><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong></div><i><em :style="{ width: `${metric.width}%` }"></em></i><small>Decision rule: {{ metric.rule }}</small></article></div>
                <p class="pdf-page__interpretation"><b>GRAPH EXPLANATION &amp; ANALYTICAL INTERPRETATION</b>{{ report.figures[2].explanation }}</p>
              </section>

              <section class="pdf-page__panel">
                <header class="pdf-page__panel-heading"><div><span class="pdf-page__figure">FIGURE 04</span><h3>Equipment utilization overview</h3><p>Category-level utilization modeling and top equipment demand trends.</p></div><b>{{ metrics.utilizationStatus }}</b></header>
                <div class="pdf-page__utilization-layout"><div><h4>Category utilization modeling</h4><div v-if="categoryMetrics.length" class="pdf-page__bars"><div v-for="item in categoryMetrics" :key="item.label"><span>{{ item.label }}</span><i><em :style="{ width: `${item.value}%` }"></em></i><b>{{ item.value }}%</b></div></div><p v-else class="pdf-page__empty">No category utilization data is available for this date range.</p>
                  <h4>Top frequently used equipment</h4><table><thead><tr><th>Equipment</th><th>Requests</th><th>Recommended action</th></tr></thead><tbody><tr v-for="item in topEquipment" :key="item.name"><td>{{ item.name }}</td><td>{{ item.count }}</td><td>{{ item.action }}</td></tr><tr v-if="!topEquipment.length"><td colspan="3">No equipment requests were recorded in this period.</td></tr></tbody></table></div>
                  <aside class="pdf-page__summary"><h4>System summary</h4><div v-for="item in summaryMetrics" :key="item.label"><span>{{ item.label }}</span><b>{{ item.value }}</b></div><strong>{{ telemetryMode === 'simulated' ? 'SIMULATED' : 'LIVE BASELINE' }}</strong></aside>
                </div>
                <p class="pdf-page__interpretation pdf-page__interpretation--green"> <b>GRAPH EXPLANATION &amp; ANALYTICAL INTERPRETATION</b>{{ report.figures[3].explanation }}</p>
              </section>
              </template>
              <template v-else>
                <section class="pdf-page__panel"><header class="pdf-page__panel-heading"><div><span class="pdf-page__figure">REPORT NOTES</span><h3>Operational interpretation</h3><p>Automatically generated from the selected report data.</p></div></header><p class="pdf-page__interpretation pdf-page__interpretation--green"><b>RECOMMENDED REVIEW</b>{{ report.figures[3].explanation }}</p></section>
              </template>

              <section class="pdf-page__signoff"><header><h3>Report certification &amp; executive sign-off</h3><span>Date issued: {{ report.signOffDate }}</span></header><div class="pdf-page__signoff-grid"><article><small>Prepared by:</small><strong>{{ report.preparedName }}</strong><span>{{ report.preparedRole }}</span><b>Signature / Date</b></article><article><small>Approved by:</small><strong>{{ report.approvedName }}</strong><span>{{ report.approvedRole }}</span><b>Signature / Date</b></article></div></section>
            </div>
            <footer class="pdf-page__footer"><span>End of executive report · {{ telemetryMode === 'simulated' ? 'Simulated telemetry' : 'Verified TechReserve data' }}</span><b>Page 2 of {{ totalReportPages }}</b></footer>
          </article>

          <article v-for="(chunk, chunkIndex) in extraReportChunks" :key="`register-${chunkIndex}`" class="pdf-page pdf-page--two">
            <header class="pdf-page__running-header"><strong>{{ reportTypeLabel }} detail register</strong><span>{{ report.period }}</span></header>
            <div class="pdf-page__body pdf-page__body--second">
              <section class="pdf-page__panel pdf-page__full-table-panel">
                <header class="pdf-page__panel-heading"><div><span class="pdf-page__figure">TABLE 01 · CONTINUED</span><h3>{{ reportTypeLabel }} records, continued</h3><p>Additional records from the selected dataset.</p></div><b>{{ chunk.length }} records</b></header>
                <div class="pdf-page__data-table-wrap"><table class="pdf-page__data-table"><thead><tr><th v-for="column in reportColumns" :key="column.key">{{ column.label }}</th></tr></thead><tbody><tr v-for="(row, index) in chunk" :key="row.id || index"><td v-for="column in reportColumns" :key="column.key">{{ row[column.key] ?? '—' }}</td></tr></tbody></table></div>
              </section>
            </div>
            <footer class="pdf-page__footer"><span>Confidential {{ reportTypeLabel.toLowerCase() }} report · TechReserve</span><b>Page {{ chunkIndex + 3 }} of {{ totalReportPages }}</b></footer>
          </article>
        </div>
      </section>
    </main>
  </AdminSidebarLayoutComponent>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import AdminSidebarLayoutComponent from '@/shared/components/AdminSidebarLayoutComponent.vue';
import { adminNavigationItems } from '@/shared/constants/adminNavigationItems.js';
import adminAnalyticsApi from '@/modules/dashboard/services/adminAnalyticsApi.js';
import reservationApi from '@/modules/reservation/services/reservationApi.js';
import equipmentApi from '@/modules/reservation/services/equipmentApi.js';
import { adminManageAccountsApi } from '@/services/adminManageAccountsApi.js';
import { useAuthenticationStore } from '@/modules/authentication/store/authenticationStore.js';
import '@/shared/components/adminSidebarLayout.css';
import './css/PdfReportStudio.css';

const dateNow = new Date();
const dateEnd = dateNow.toISOString().slice(0, 10);
const dateStart = new Date(dateNow.getTime() - 29 * 86400000).toISOString().slice(0, 10);
const isLoading = ref(false);
const isExporting = ref(false);
const loadError = ref('');
const documentRef = ref(null);
const telemetryMode = ref('live');
const reportType = ref('analytics');
const authStore = useAuthenticationStore();
const report = reactive({
  organization: 'TechReserve · Operations & Resource Intelligence Unit',
  title: 'Operational Analytics & Equipment Readiness Report',
  period: `${formatDate(dateStart)} – ${formatDate(dateEnd)}`,
  generatedAt: new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(dateNow),
  executiveBrief: 'This executive brief synthesizes predictive demand modeling, inventory readiness risk scoring, and constrained allocation efficiency across tracked operational assets for the selected review window.',
  preparedName: 'Alexandria M. Reyes',
  preparedRole: 'Lead Data & Operations Analyst',
  approvedName: 'Engr. Gabriel D. Santos',
  approvedRole: 'Director of Logistics & Readiness',
  signOffDate: new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(dateNow),
  figures: [
    { label: 'Fig 1. Demand Forecasting Explanation', explanation: 'TLDR: Demand projections summarize recent reservation activity. What this graph shows: observed activity and near-term forecast values across the selected reporting period. Interpretation: use projected demand to plan equipment availability and prepare for expected peaks.' },
    { label: 'Fig 2. Readiness Risk Detection Explanation', explanation: 'What this graph shows: equipment inventory distributed across readiness risk bands. Interpretation: review high-risk items and address overdue returns, low stock pressure, or inactive availability before demand increases.' },
    { label: 'Fig 3. Resource Allocation (R-ILP) Explanation', explanation: 'What this graph shows: allocation indicators for conflict reduction, equipment utilization, constraint satisfaction, and unassigned requests. Interpretation: resolve bottlenecks and rebalance inventory when the selected period shows capacity pressure.' },
    { label: 'Fig 4. Equipment Utilization & Summary Explanation', explanation: 'What this table shows: category-level utilization and the most requested equipment, paired with system-wide operational totals. Interpretation: use category demand and request volume to guide readiness and purchasing decisions.' },
  ],
});
const sourceData = ref({});
const reportTypeLabels = { analytics: 'Analytics', reservations: 'Reservations', inventory: 'Inventory', accounts: 'Accounts' };
const models = [
  { number: '01', label: 'Demand trend', title: 'Operational forecasting', algorithm: 'SARIMA', summary: 'Projects upcoming equipment demand from reservation activity.', tone: 'green' },
  { number: '02', label: 'Risk bands', title: 'Inventory monitoring', algorithm: 'Random Forest', summary: 'Highlights stock pressure, overdue returns and usage frequency.', tone: 'amber' },
  { number: '03', label: 'Allocation', title: 'Operational optimization', algorithm: 'R-ILP', summary: 'Tracks fulfillment, utilization and pending request pressure.', tone: 'green' },
  { number: '04', label: 'Utilization', title: 'Usage modeling', algorithm: 'Random Forest', summary: 'Models category-level equipment utilization and inventory load.', tone: 'amber' },
];

const summary = computed(() => sourceData.value.summary || {});
const forecast = computed(() => sourceData.value.forecast || {});
const metrics = computed(() => {
  const forecastSeries = Array.isArray(forecast.value.forecastSeries) ? forecast.value.forecastSeries : [];
  const peak = Number(forecast.value.peakValue || 0);
  const riskBands = sourceData.value.riskDistribution?.bands || [];
  const equipmentTotal = Number(summary.value.totalEquipment || 0);
  const riskTotal = Array.isArray(riskBands)
    ? riskBands.slice(0, 2).reduce((total, item) => total + Number(item?.count || 0), 0)
    : 0;
  const simulated = telemetryMode.value === 'simulated';
  return {
    forecastModel: forecast.value.modelName || forecast.value.model || 'Seasonal history fallback',
    peakDate: simulated ? formatDate(dateEnd) : forecast.value.peakDate ? formatDate(forecast.value.peakDate) : 'No peak recorded',
    peakValue: simulated ? '12' : peak.toLocaleString(),
    growth: simulated ? '+18.6%' : `${Number(forecast.value.growthPercent || 0).toFixed(1)}%`,
    forecastStatus: simulated ? 'Illustrative scenario' : forecast.value.validationStatus || 'Seasonal fallback',
    riskScore: simulated ? 12 : equipmentTotal ? Math.round((riskTotal / equipmentTotal) * 100) : 0,
    riskStatus: simulated ? 'Diagnostics: simulated' : equipmentTotal ? 'Diagnostics: verified' : 'Awaiting activity',
    utilizationStatus: categoryMetrics.value.length ? 'Category data available' : 'Awaiting activity',
  };
});
const forecastValues = computed(() => {
  const series = Array.isArray(forecast.value.forecastSeries) ? forecast.value.forecastSeries : [];
  if (telemetryMode.value === 'simulated') return [2, 3, 2, 5, 4, 7, 6, 10, 8, 12];
  return series.slice(-10).map((item) => Number(item.value ?? item.count ?? item.forecast ?? 0));
});
const normalizedForecast = computed(() => {
  const values = forecastValues.value;
  if (!values.length || values.every((value) => value === 0)) return Array.from({ length: 10 }, () => 0);
  const max = Math.max(...values, 1);
  return Array.from({ length: 10 }, (_, index) => Number(values[Math.min(index, values.length - 1)] || 0) / max);
});
const forecastPoints = computed(() => normalizedForecast.value.map((value, index) => `${42 + index * 60},${173 - value * 135}`).join(' '));
const forecastDots = computed(() => normalizedForecast.value.map((value, index) => ({ x: 42 + index * 60, y: 173 - value * 135 })));
const chartLabels = computed(() => {
  const series = Array.isArray(forecast.value.forecastSeries) ? forecast.value.forecastSeries.slice(-7) : [];
  if (telemetryMode.value === 'simulated') return ['Oct 27', 'Oct 31', 'Nov 4', 'Nov 8', 'Nov 12', 'Nov 16', 'Nov 20'];
  return Array.from({ length: 7 }, (_, index) => (series[index]?.label || series[index]?.date) ? formatShortDate(series[index].label || series[index].date) : `Day ${index + 1}`);
});
const riskBands = computed(() => {
  if (telemetryMode.value === 'simulated') return [
    { label: 'High risk', count: 2, tone: 'high' },
    { label: 'Medium risk', count: 4, tone: 'medium' },
    { label: 'Low risk', count: 8, tone: 'low' },
    { label: 'Very low risk', count: 26, tone: 'very-low' },
  ];
  const items = sourceData.value.riskDistribution?.bands || sourceData.value.riskDistribution?.riskBands || [];
  if (Array.isArray(items) && items.length) return items.map((item, index) => ({ label: item.label || item.name || `Risk ${index + 1}`, count: Number(item.count || 0), tone: ['high', 'medium', 'low', 'very-low'][index] || 'very-low' }));
  return [{ label: 'High risk', count: 0, tone: 'high' }, { label: 'Medium risk', count: 0, tone: 'medium' }, { label: 'Low risk', count: 0, tone: 'low' }, { label: 'Very low risk', count: Number(summary.value.totalEquipment || 0), tone: 'very-low' }];
});
const riskFactors = computed(() => telemetryMode.value === 'simulated'
  ? ['Low stock pressure', 'Overlapping peak demand', 'High usage frequency', 'Overdue return linkage']
  : sourceData.value.riskDistribution?.topRiskFactors || ['Low stock pressure', 'Inactive availability state', 'High usage frequency', 'Overdue return linkage']);
const optimizationMetrics = computed(() => {
  const values = Array.isArray(sourceData.value.optimizationMetrics) ? sourceData.value.optimizationMetrics : [];
  const defaults = [
    { label: 'Conflict reduction', value: 0, rule: 'Reduce clashes by reserving fewer overlapping items.' },
    { label: 'Equipment utilization', value: 0, rule: 'Keep current allocation if demand is steady.' },
    { label: 'Constraint satisfaction', value: 0, rule: 'Continue current plan and monitor unresolved requests.' },
    { label: 'Unassigned requests', value: 0, rule: 'Reassign idle inventory or relax scheduling limits.' },
  ];
  return defaults.map((item, index) => {
    const live = values[index] || {};
    const value = telemetryMode.value === 'simulated' ? [18.4, 62.3, 94.1, 5.2][index] : Number(live.value || 0);
    return { ...item, label: live.label || item.label, value: `${value.toFixed(1)}%`, width: Math.min(100, Math.abs(value)), rule: item.rule };
  });
});
const categoryMetrics = computed(() => {
  if (telemetryMode.value === 'simulated') return [
    { label: 'Audio & visual', value: 72 },
    { label: 'Computing', value: 61 },
    { label: 'Facilities', value: 44 },
  ];
  const values = sourceData.value.utilizationByCategory;
  if (!Array.isArray(values)) return [];
  return values.slice(0, 5).map((item) => ({ label: item.category || item.label || item.name || 'Equipment', value: Math.max(0, Math.min(100, Number(item.utilizationRate ?? item.utilization ?? item.value ?? 0))) }));
});
const topEquipment = computed(() => {
  if (telemetryMode.value === 'simulated') return [
    { name: 'Wireless microphone', count: 18, action: 'Prepare 4 units' },
    { name: 'Projector', count: 14, action: 'Check availability' },
    { name: 'Laptop', count: 11, action: 'Maintain buffer stock' },
  ];
  const values = sourceData.value.topEquipment;
  if (!Array.isArray(values)) return [];
  return values.slice(0, 4).map((item) => ({ name: item.name || item.equipmentName || 'Equipment', count: Number(item.count || item.requestCount || 0), action: item.action || item.recommendedAction || `Readiness ${Number(item.rate || 0).toFixed(0)}%` }));
});
const summaryMetrics = computed(() => telemetryMode.value === 'simulated' ? [
  { label: 'Total equipment', value: 42 },
  { label: 'Active reservations', value: 18 },
  { label: 'Pending requests', value: 6 },
  { label: 'Completed this period', value: 53 },
] : [
  { label: 'Total equipment', value: Number(summary.value.totalEquipment || 0) },
  { label: 'Active reservations', value: Number(summary.value.activeReservations || 0) },
  { label: 'Pending requests', value: Number(summary.value.pendingRequests || 0) },
  { label: 'Completed this period', value: Number(summary.value.completedThisPeriod || 0) },
]);
const reportTypeLabel = computed(() => reportTypeLabels[reportType.value] || 'Analytics');
const datasetHelpText = computed(() => ({
  analytics: 'Live demand forecast, readiness risk, utilization, and allocation metrics.',
  reservations: 'Reservation activity in the current reporting window, grouped by status.',
  inventory: 'Equipment quantities, availability, category, and operational status.',
  accounts: 'Accepted accounts with role, access status, and creation details.',
})[reportType.value]);
const datasetOverviewTitle = computed(() => ({
  reservations: 'Reservation activity overview',
  inventory: 'Inventory readiness overview',
  accounts: 'Account access overview',
})[reportType.value] || 'Dataset overview');
const datasetOverviewSubtitle = computed(() => ({
  reservations: 'Requests in the selected period, grouped by current workflow status.',
  inventory: 'Equipment records grouped by operational state.',
  accounts: 'Accepted accounts grouped by assigned role.',
})[reportType.value] || 'Records in the selected report dataset.');
const datasetTableTitle = computed(() => ({ reservations: 'Reservation register', inventory: 'Equipment inventory register', accounts: 'Account register' })[reportType.value] || 'Report register');
const datasetTableSubtitle = computed(() => `Report period: ${report.period}. Data is sourced from the TechReserve application.`);
const filteredReservations = computed(() => {
  const rows = sourceData.value.reservations || [];
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) => {
    const eventDay = String(row.eventDateTime || '').slice(0, 10);
    return !eventDay || (eventDay >= dateStart && eventDay <= dateEnd);
  });
});
const reportRows = computed(() => {
  if (reportType.value === 'reservations') return filteredReservations.value.map((row) => ({
    id: row.reservationIdentifier,
    reference: row.reservationCode || `RES-${row.reservationIdentifier || ''}`,
    requester: row.borrowerFullName || [row.borrowerFirstName, row.borrowerLastName].filter(Boolean).join(' ') || 'Requester',
    organization: row.organizationName || '—',
    event: formatShortDate(row.eventDateTime || ''),
    status: row.currentStatus || 'Unknown',
  }));
  if (reportType.value === 'inventory') return (sourceData.value.equipment || []).map((row) => ({
    id: row.equipmentIdentifier,
    asset: row.assetId || row.equipmentName || 'Equipment',
    item: row.equipmentName || 'Equipment',
    category: row.equipmentCategory || row.categoryName || 'Other',
    total: Number(row.totalQuantity || 0),
    available: Number(row.availableQuantity || 0),
    reserved: Number(row.reservedQuantity || 0),
    maintenance: Number(row.underMaintenanceQuantity || 0),
    status: row.operationalStatus || row.equipmentState || 'Unknown',
  }));
  if (reportType.value === 'accounts') return (sourceData.value.accounts || []).map((row) => ({
    id: row.accountIdentifier,
    account: row.accountIdentifier ? `ACC-${row.accountIdentifier}` : 'Account',
    name: [row.firstName, row.lastName].filter(Boolean).join(' ') || 'Unnamed account',
    email: row.emailAddress || '—',
    role: row.roleDesignation || row.accountType || 'Unassigned',
    status: row.isActive === false ? 'Inactive' : 'Active',
    created: formatShortDate(row.createdTimestamp || ''),
  }));
  return [];
});
const reportSummaryCards = computed(() => {
  const rows = reportRows.value;
  if (reportType.value === 'reservations') {
    const count = (predicate) => rows.filter(predicate).length;
    const pending = count((row) => row.status.toLowerCase().includes('pending'));
    const approved = count((row) => ['approved', 'prepared', 'deployed'].includes(row.status.toLowerCase()));
    const completed = count((row) => ['completed', 'returned'].includes(row.status.toLowerCase()));
    return [
      { label: 'Total requests', value: rows.length, note: 'Within the reporting period' },
      { label: 'Pending', value: pending, note: 'Awaiting a decision' },
      { label: 'Approved / active', value: approved, note: 'Approved, prepared, or deployed' },
      { label: 'Completed', value: completed, note: 'Completed or returned' },
    ];
  }
  if (reportType.value === 'inventory') {
    const equipment = sourceData.value.equipment || [];
    const sum = (key) => equipment.reduce((total, row) => total + Number(row[key] || 0), 0);
    return [
      { label: 'Equipment records', value: equipment.length, note: 'Tracked inventory items' },
      { label: 'Total units', value: sum('totalQuantity'), note: 'Units across all records' },
      { label: 'Available', value: sum('availableQuantity'), note: 'Ready for reservation' },
      { label: 'In maintenance', value: sum('underMaintenanceQuantity'), note: 'Currently unavailable' },
    ];
  }
  const accounts = sourceData.value.accounts || [];
  const active = accounts.filter((row) => row.isActive !== false).length;
  const roleCount = new Set(accounts.map((row) => row.roleDesignation || row.accountType).filter(Boolean)).size;
  return [
    { label: 'Total accounts', value: accounts.length, note: 'Accepted account records' },
    { label: 'Active', value: active, note: 'Access currently enabled' },
    { label: 'Inactive', value: accounts.length - active, note: 'Access currently disabled' },
    { label: 'Role groups', value: roleCount, note: 'Distinct assigned roles' },
  ];
});
const reportDistribution = computed(() => {
  const groupKey = reportType.value === 'reservations' ? 'status' : reportType.value === 'inventory' ? 'status' : 'role';
  const grouped = new Map();
  reportRows.value.forEach((row) => {
    const label = row[groupKey] || 'Unknown';
    grouped.set(label, (grouped.get(label) || 0) + 1);
  });
  const colors = ['#16834a', '#e7b800', '#4f9bca', '#ea7959', '#8c78bd'];
  const total = Math.max(1, reportRows.value.length);
  return [...grouped.entries()].sort((left, right) => right[1] - left[1]).slice(0, 5).map(([label, count], index) => ({ label, count, percent: Math.round((count / total) * 100), color: colors[index % colors.length] }));
});
const reportColumns = computed(() => ({
  reservations: [{ key: 'reference', label: 'Reference' }, { key: 'requester', label: 'Requester' }, { key: 'organization', label: 'Organization' }, { key: 'event', label: 'Event date' }, { key: 'status', label: 'Status' }],
  inventory: [{ key: 'asset', label: 'Asset ID' }, { key: 'item', label: 'Equipment' }, { key: 'category', label: 'Category' }, { key: 'total', label: 'Total' }, { key: 'available', label: 'Available' }, { key: 'reserved', label: 'Reserved' }, { key: 'maintenance', label: 'Maintenance' }, { key: 'status', label: 'Status' }],
  accounts: [{ key: 'account', label: 'Account ID' }, { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role' }, { key: 'status', label: 'Access' }, { key: 'created', label: 'Created' }],
})[reportType.value] || []);
const previewRows = computed(() => reportRows.value.slice(0, 6));
const extraReportChunks = computed(() => {
  const rows = reportRows.value.slice(6);
  const chunks = [];
  for (let index = 0; index < rows.length; index += 20) chunks.push(rows.slice(index, index + 20));
  return chunks;
});
const totalReportPages = computed(() => reportType.value === 'analytics' ? 2 : 2 + extraReportChunks.value.length);

watch([sourceData, telemetryMode, reportType], generateGraphInterpretations, { immediate: true, deep: true });
onMounted(loadReportData);

async function loadReportData() {
  isLoading.value = true;
  loadError.value = '';
  try {
    if (reportType.value === 'analytics') {
      sourceData.value = await adminAnalyticsApi.getReportsAnalytics({ startDateIso: dateStart, endDateIso: dateEnd });
    } else if (reportType.value === 'reservations') {
      const payload = unwrapApiPayload(await reservationApi.listReservations({ startDate: dateStart, endDate: dateEnd }));
      sourceData.value = { ...payload, reservations: Array.isArray(payload.reservations) ? payload.reservations : [] };
    } else if (reportType.value === 'inventory') {
      const payload = unwrapApiPayload(await equipmentApi.listEquipment());
      sourceData.value = { ...payload, equipment: Array.isArray(payload.equipment) ? payload.equipment : [] };
    } else {
      const result = await adminManageAccountsApi.getAccounts(authStore.authToken);
      if (!result.success) throw new Error(result.error || 'Unable to load account records.');
      const payload = result.data || {};
      sourceData.value = { ...payload, accounts: Array.isArray(payload.accounts) ? payload.accounts : [] };
    }
  } catch (error) {
    sourceData.value = {};
    loadError.value = error?.response?.data?.errorMessage || error?.message || `Live ${reportTypeLabel.value.toLowerCase()} data could not be loaded.`;
  } finally {
    isLoading.value = false;
  }
}

function handleReportTypeChange() {
  telemetryMode.value = 'live';
  sourceData.value = {};
  const config = {
    analytics: {
      title: 'Operational Analytics & Equipment Readiness Report',
      brief: 'This executive brief synthesizes predictive demand modeling, inventory readiness risk scoring, and constrained allocation efficiency across tracked operational assets for the selected review window.',
      figures: ['Demand Forecasting Explanation', 'Readiness Risk Detection Explanation', 'Resource Allocation (R-ILP) Explanation', 'Equipment Utilization & Summary Explanation'],
    },
    reservations: {
      title: 'Reservation Activity & Fulfillment Report',
      brief: 'This report summarizes reservation activity during the selected reporting window, including request volume, workflow status, event dates, and fulfillment trends.',
      figures: ['Reservation Volume & Status', 'Request Fulfillment Findings', 'Reservation Register Coverage', 'Recommended Reservation Review'],
    },
    inventory: {
      title: 'Equipment Inventory & Readiness Report',
      brief: 'This report summarizes tracked equipment, unit availability, reserved quantities, maintenance levels, and operational readiness across the inventory register.',
      figures: ['Inventory Availability & Status', 'Equipment Readiness Findings', 'Inventory Register Coverage', 'Recommended Inventory Review'],
    },
    accounts: {
      title: 'Account Access & Role Summary Report',
      brief: 'This report summarizes accepted TechReserve accounts, role distribution, active access status, and account creation coverage for administrative review.',
      figures: ['Account Roles & Access', 'Account Status Findings', 'Account Register Coverage', 'Recommended Access Review'],
    },
  }[reportType.value];
  if (config) {
    report.title = config.title;
    report.executiveBrief = config.brief;
    report.figures.forEach((figure, index) => { figure.label = `Fig ${index + 1}. ${config.figures[index]}`; });
  }
  loadReportData();
}

function unwrapApiPayload(response) {
  const body = response?.data ?? response ?? {};
  return body?.data ?? body;
}

function generateGraphInterpretations() {
  if (reportType.value !== 'analytics') {
    generateDatasetInterpretations();
    return;
  }
  const simulated = telemetryMode.value === 'simulated';
  const series = Array.isArray(forecast.value.forecastSeries) ? forecast.value.forecastSeries : [];
  const demandValues = simulated ? [2, 3, 2, 5, 4, 7, 6, 10, 8, 12] : series.map((item) => Number(item.value ?? item.count ?? item.forecast ?? 0));
  const demandPeak = demandValues.length ? Math.max(...demandValues) : 0;
  const demandFirst = demandValues[0] || 0;
  const demandLast = demandValues[demandValues.length - 1] || 0;
  const demandChange = demandLast - demandFirst;
  const peakLabel = simulated ? 'Nov 25' : forecast.value.peakDate ? formatShortDate(forecast.value.peakDate) : 'the end of the forecast window';
  const demandText = demandPeak === 0
    ? `TLDR: No reservation demand was recorded in the selected period. The forecast remains at 0 requests, with no projected peak. Interpretation: the current data supports a stable baseline; continue monitoring new reservations before changing equipment capacity.${simulated ? ' This is simulated activity.' : ''}`
    : `TLDR: Forecasted demand peaks at ${demandPeak.toFixed(1)} requests around ${peakLabel}. ${demandChange > 0 ? `The displayed series rises by ${demandChange.toFixed(1)} requests from its first to last point.` : demandChange < 0 ? `The displayed series falls by ${Math.abs(demandChange).toFixed(1)} requests from its first to last point.` : 'The displayed series is steady from its first to last point.'} Interpretation: use the projected peak to plan equipment readiness and watch for capacity pressure.${simulated ? ' These values are illustrative.' : ''}`;

  const bands = riskBands.value;
  const highCount = Number(bands[0]?.count || 0);
  const mediumCount = Number(bands[1]?.count || 0);
  const riskTotal = bands.reduce((sum, band) => sum + Number(band.count || 0), 0);
  const riskPercent = metrics.value.riskScore;
  const factors = riskFactors.value.slice(0, 3).join(', ');
  const riskText = riskTotal === 0
    ? `TLDR: No equipment records are available to classify in this view. Interpretation: refresh the analytics or add inventory data before using the readiness score for operational decisions.${simulated ? ' The simulation selection did not return any risk bands.' : ''}`
    : `TLDR: ${highCount} high-risk and ${mediumCount} medium-risk units were identified across ${riskTotal} classified units; the high/medium risk index is ${riskPercent}%. Main monitored factors include ${factors}. Interpretation: prioritize high-risk units first, then address the factors driving medium-risk classifications.${simulated ? ' Counts are simulated.' : ''}`;

  const rawOptimization = Array.isArray(sourceData.value.optimizationMetrics) ? sourceData.value.optimizationMetrics : [];
  const optimizationValues = telemetryMode.value === 'simulated' ? [18.4, 62.3, 94.1, 5.2] : rawOptimization.map((item) => Number(item.value || 0));
  const conflict = Number(optimizationValues[0] || 0);
  const utilization = Number(optimizationValues[1] || 0);
  const satisfaction = Number(optimizationValues[2] || 0);
  const unassigned = Number(optimizationValues[3] || 0);
  const allocationText = `TLDR: The report shows ${conflict.toFixed(1)}% conflict reduction, ${utilization.toFixed(1)}% equipment utilization change, ${satisfaction.toFixed(1)}% constraint satisfaction, and ${unassigned.toFixed(1)}% change in unassigned requests. Interpretation: ${unassigned > 0 ? 'review unassigned requests and rebalance availability while preserving the current constraint satisfaction.' : 'maintain the current allocation plan and monitor conflict and utilization changes in the next reporting period.'}${simulated ? ' Values are illustrative.' : ''}`;

  const leadingCategory = categoryMetrics.value[0];
  const leadingEquipment = topEquipment.value[0];
  const summaryText = `TLDR: The system records ${summaryMetrics.value[0]?.value || 0} equipment units, ${summaryMetrics.value[1]?.value || 0} active reservations, ${summaryMetrics.value[2]?.value || 0} pending requests, and ${summaryMetrics.value[3]?.value || 0} completed requests in this view. ${leadingCategory ? `${leadingCategory.label} leads category utilization at ${leadingCategory.value.toFixed(1)}%.` : 'No category utilization data is available.'} ${leadingEquipment ? `${leadingEquipment.name} is the most requested item with ${leadingEquipment.count} requests.` : 'No top equipment trend is available yet.'} Interpretation: use these demand leaders to prioritize preparation and inventory checks.${simulated ? ' All values in this mode are simulated.' : ''}`;

  const generated = [demandText, riskText, allocationText, summaryText];
  generated.forEach((text, index) => {
    if (report.figures[index]) report.figures[index].explanation = text;
  });
}

function generateDatasetInterpretations() {
  const cards = reportSummaryCards.value;
  const distribution = reportDistribution.value;
  const leadingGroup = distribution[0];
  const count = (label) => Number(cards.find((item) => item.label === label)?.value || 0);
  let narratives = [];

  if (reportType.value === 'reservations') {
    const total = reportRows.value.length;
    const pending = count('Pending');
    const approved = count('Approved / active');
    const completed = count('Completed');
    const pendingRate = total ? Math.round((pending / total) * 100) : 0;
    const leading = topCountLabel(reportDistribution.value);
    narratives = [
      total
        ? `TLDR: ${total} reservations fall within the selected period. ${pending} (${pendingRate}%) are pending, ${approved} are approved or active, and ${completed} are completed or returned. ${leading ? `${leading.label} is the largest status group.` : ''} Interpretation: prioritize pending requests approaching their event dates and monitor completion of active reservations.`
        : 'No reservation events were found in the selected period. Interpretation: widen the reporting dates or refresh the data before drawing conclusions about request volume.',
      `What the register shows: ${reportRows.value.length} reservation records with requester, organization, event date, and current status. ${pending ? `${pending} requests still require review.` : 'No requests are currently marked pending.'} Interpretation: use event dates and status to plan review and fulfillment workload.`,
      `Coverage: the report includes reservations dated ${report.period}. Records outside this period are excluded. ${leadingGroup ? `${leadingGroup.label} accounts for ${leadingGroup.percent}% of listed requests.` : 'No status distribution is available.'} Interpretation: compare this distribution with prior periods to identify changes in demand or processing backlog.`,
      pendingRate >= 35
        ? `Recommended review: the pending share is ${pendingRate}%, so review the pending queue and upcoming event dates first. Check for missing information or scheduling conflicts before approving requests.`
        : `Recommended review: ${pending} requests are pending and ${approved} are approved or active. Continue standard review and preparation checks, and follow each reservation through return or completion.`,
    ];
  } else if (reportType.value === 'inventory') {
    const records = count('Equipment records');
    const units = count('Total units');
    const available = count('Available');
    const maintenance = count('In maintenance');
    const availabilityRate = units ? Math.round((available / units) * 100) : 0;
    const lowAvailability = reportRows.value.filter((row) => row.total > 0 && row.available / row.total <= 0.2).length;
    const topCategory = categoryLabel(reportRows.value);
    narratives = [
      records
        ? `TLDR: ${records} equipment records cover ${units} units. ${available} units (${availabilityRate}%) are available and ${maintenance} are under maintenance. ${lowAvailability} records have availability at or below 20%. Interpretation: prioritize low-availability equipment and maintenance returns when preparing for upcoming requests.`
        : 'No inventory records are available. Interpretation: refresh the equipment list or add inventory records before using this report for readiness decisions.',
      `What the register shows: equipment quantities by item, category, and operational status. ${topCategory ? `${topCategory} is the most represented category in this report.` : 'No leading category is available.'} Interpretation: compare available and reserved units against expected demand, and investigate records with low stock or maintenance needs.`,
      `Coverage: ${records} equipment records are included, representing ${units} tracked units. The register reports total, available, reserved, maintenance, and operational status fields. Interpretation: reconcile quantity changes with physical inventory before acting on the summary.`,
      lowAvailability
        ? `Recommended review: ${lowAvailability} equipment records have 20% or less availability. Check their reservation schedule, maintenance state, and replacement needs before the next high-demand period.`
        : 'Recommended review: no equipment item is at or below the 20% availability threshold. Maintain routine stock checks and monitor reservation pressure and maintenance changes.',
    ];
  } else {
    const total = count('Total accounts');
    const active = count('Active');
    const inactive = count('Inactive');
    const activeRate = total ? Math.round((active / total) * 100) : 0;
    const roleGroups = count('Role groups');
    const dominantRole = leadingGroup?.label || 'No role group';
    narratives = [
      total
        ? `TLDR: ${total} accepted accounts are listed across ${roleGroups} role groups. ${active} accounts (${activeRate}%) are active and ${inactive} are inactive. ${dominantRole} is the largest group. Interpretation: review inactive accounts and confirm access still matches current responsibilities.`
        : 'No accepted accounts are available in this report. Interpretation: refresh the account directory before reviewing role coverage or access status.',
      `What the register shows: account identifier, name, email, assigned role, access state, and creation date for ${total} accounts. ${inactive ? `${inactive} accounts currently have access disabled.` : 'All listed accounts currently have access enabled.'} Interpretation: confirm role assignments and account ownership with the relevant department.`,
      `Coverage: ${total} accepted account records across ${roleGroups} distinct role groups. This report does not include pending signup requests. Interpretation: use the accepted-account register for current access review, and review pending requests separately.`,
      inactive
        ? `Recommended review: check the ${inactive} inactive accounts for outdated access and confirm any reactivation requests with an administrator. Review privileged roles periodically.`
        : 'Recommended review: no inactive accounts were found. Continue periodic checks of privileged roles and remove access promptly when responsibilities change.',
    ];
  }

  narratives.forEach((text, index) => {
    if (report.figures[index]) report.figures[index].explanation = text;
  });
}

function topCountLabel(items) {
  return items[0] ? { label: items[0].label, count: items[0].count } : null;
}

function categoryLabel(rows) {
  const categories = new Map();
  rows.forEach((row) => categories.set(row.category, (categories.get(row.category) || 0) + row.total));
  const top = [...categories.entries()].sort((left, right) => right[1] - left[1])[0];
  return top?.[0] || '';
}

function resetReport() {
  Object.assign(report, {
    organization: 'TechReserve · Operations & Resource Intelligence Unit',
    title: 'Operational Analytics & Equipment Readiness Report',
    period: `${formatDate(dateStart)} – ${formatDate(dateEnd)}`,
    generatedAt: new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
    executiveBrief: 'This executive brief synthesizes predictive demand modeling, inventory readiness risk scoring, and constrained allocation efficiency across tracked operational assets for the selected review window.',
    preparedName: 'Alexandria M. Reyes',
    preparedRole: 'Lead Data & Operations Analyst',
    approvedName: 'Engr. Gabriel D. Santos',
    approvedRole: 'Director of Logistics & Readiness',
    signOffDate: new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date()),
    figures: [
      { label: 'Fig 1. Demand Forecasting Explanation', explanation: 'TLDR: Demand projections summarize recent reservation activity. What this graph shows: observed activity and near-term forecast values across the selected reporting period. Interpretation: use projected demand to plan equipment availability and prepare for expected peaks.' },
      { label: 'Fig 2. Readiness Risk Detection Explanation', explanation: 'What this graph shows: equipment inventory distributed across readiness risk bands. Interpretation: review high-risk items and address overdue returns, low stock pressure, or inactive availability before demand increases.' },
      { label: 'Fig 3. Resource Allocation (R-ILP) Explanation', explanation: 'What this graph shows: allocation indicators for conflict reduction, equipment utilization, constraint satisfaction, and unassigned requests. Interpretation: resolve bottlenecks and rebalance inventory when the selected period shows capacity pressure.' },
      { label: 'Fig 4. Equipment Utilization & Summary Explanation', explanation: 'What this table shows: category-level utilization and the most requested equipment, paired with system-wide operational totals. Interpretation: use category demand and request volume to guide readiness and purchasing decisions.' },
    ],
  });
  reportType.value = 'analytics';
  telemetryMode.value = 'live';
  loadReportData();
}

async function exportPdf() {
  if (!documentRef.value || isExporting.value) return;
  isExporting.value = true;
  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pages = [...documentRef.value.querySelectorAll('.pdf-page')];
    for (const [index, page] of pages.entries()) {
      const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, windowWidth: page.scrollWidth, windowHeight: page.scrollHeight });
      const image = canvas.toDataURL('image/jpeg', 0.96);
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      const scale = Math.min(width / canvas.width, height / canvas.height);
      const renderWidth = canvas.width * scale;
      const renderHeight = canvas.height * scale;
      if (index > 0) pdf.addPage();
      pdf.addImage(image, 'JPEG', (width - renderWidth) / 2, (height - renderHeight) / 2, renderWidth, renderHeight);
    }
    pdf.save(`techreserve-executive-report-${dateStart}-to-${dateEnd}.pdf`);
  } catch (error) {
    loadError.value = error?.message || 'Unable to create the PDF. Please try again.';
  } finally {
    isExporting.value = false;
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}
function formatShortDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 8) : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}
</script>
