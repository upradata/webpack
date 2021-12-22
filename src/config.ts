import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import type { Options as TsLoaderOptions } from 'ts-loader';
import { TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import type { TransformOptions as BabelOptions } from '@babel/core';
import { assignRecursive } from '@upradata/util';


export type WebpackConfigOptions = {
    exportVarName?: string;
    babel?: BabelOptions;
    ts?: Partial<TsLoaderOptions>;
} & webpack.Configuration;


export const webpackConfig = (options: WebpackConfigOptions): webpack.Configuration => {
    const { exportVarName = 'globalThis', babel, ts, ...webpackOptions } = options;
    const { mode = 'development' } = webpackOptions;

    return assignRecursive({
        stats: {
            all: true
        }, // 'normal',
        devtool: 'eval', // mode === 'development' ? 'eval-source-map' : 'source-map',
        output: {
            filename: `[name].bundle.js`,
            library: {
                name: exportVarName,
                type: 'assign-properties'
            }, // exported bundle from entry point will be
            /*
                (function (e, a) {
                  for (var i in a) {
                    e[i] = a[i];
                  }
                })(output.libraryTarget, _entry_return_);

            */
        },
        resolve: {
            mainFields: [ 'module', 'main', 'browser' ],
            extensions: [ '.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs' ],
            symlinks: true,
            /* alias: {
                fs: 'memfs' // this will replace every import or require('fs') with 'memfs'
            } */
            plugins: [ ts.configFile ? new TsconfigPathsPlugin({ configFile: ts.configFile }) : undefined ].filter(v => !!v)

        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: /node_modules/,
                    use: [
                        babel && { loader: 'babel-loader', options: babel },
                        {
                            loader: 'ts-loader',
                            options: ts /*  {
                                configFile: tsconfig,
                                // happyPackMode: true, // IMPORTANT! use happyPackMode mode to speed-up compilation and reduce errors reported to webpack
                                // transpileOnly: true // plugin ForkTsCheckerWebpackPlugin will run type checking in a different thread
                            } as TsLoaderOptions */
                        }
                    ].filter(e => !!e)
                },
                {
                    test: /\.m?js$/,
                    exclude: /node_modules|bower_components/,
                    use: babel && { loader: 'babel-loader', options: babel }
                }
            ],
        },
        externals: {
            // jquery: 'jQuery'
        },
        plugins: [
            /* new ForkTsCheckerWebpackPlugin({
                typescript: {
                    diagnosticOptions: {
                        semantic: true,
                        syntactic: true
                    },
                    configFile: fromRoot(`tsconfig.src.${ecma}.json`),
                    mode: 'write-tsbuildinfo'
                }
            }), */
            // new CleanWebpackPlugin(/* { dangerouslyAllowCleanPatternsOutsideProject: true, dry: false } */),
            // new webpack.debug.ProfilingPlugin()
            new webpack.ProgressPlugin({
                activeModules: false,
                entries: true,
                /* handler(percentage, message, ...args) {
                    // custom logic
                }, */
                modules: true,
                modulesCount: 5000,
                profile: false,
                dependencies: true,
                dependenciesCount: 10000,
                percentBy: null
            })
        ],
        cache: {
            // 1. Set cache type to filesystem
            type: 'filesystem',

            buildDependencies: {
                // 2. Add your config as buildDependency to get cache invalidation on config change
                config: [ __filename ]

                // 3. If you have other things the build depends on you can add them here
                // Note that webpack, loaders and all modules referenced from your config are automatically added
            }
        },
        optimization: {
            moduleIds: 'named', // NamedModulesPlugin()
            // minimize: isDefined(minimize) ? minimize : options.mode === 'production',
            /* runtimeChunk: {
                name: 'webpack-runtime',
            }, */
            usedExports: true, // default but to be sure -> Tells webpack to determine used exports for each module.
            sideEffects: true, // default also -> Tells webpack to recognise the sideEffects flag in package.json
            splitChunks: {
                cacheGroups: {
                    /* tildaServices: {
                        test: /src\/services\/global/,
                        name: 'tilda-services',
                        chunks: 'all',
                        enforce: true,
                        priority: 10,
                    }, */
                    /*  tildaComponents: {
                         test: /src\/components/,
                         name: 'tilda-components',
                         chunks: 'all',
                         enforce: true,
                         priority: 10,
                     }, */
                    babel: {
                        test: /node_modules\/(@babel|core-js|regenerator-runtime|webpack)/,
                        name: 'babel-polyfills',
                        chunks: 'all',
                        enforce: true,
                        minSize: 20000,
                        priority: 2,
                    },
                    vendor: {
                        test: /node_modules/,
                        name: 'vendor',
                        chunks: 'all',
                        enforce: true,
                        minSize: 20000,
                        priority: 1,
                    }
                }
            },
            minimize: mode === 'production',
            minimizer: [
                new TerserPlugin({
                    parallel: true,
                    terserOptions: { // https://github.com/babel/preset-modules => preset-modules is enabled also with options { bugfixes: true} in @babel/preset-env
                        sourceMap: true, // Must be set to true if using source-maps in production
                        ecma: 2017 as const, // to override compress and format's ecma options
                        safari10: true, // to work around Safari 10/11 bugs in loop scoping and await
                        format: {
                            indent_level: 0
                        }
                    }
                }),
            ],
        }
    }, webpackOptions);
};
